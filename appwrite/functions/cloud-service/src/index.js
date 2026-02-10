/**
 * Cloud Service — Appwrite Function #1
 * 
 * Routes:
 *   { route: "stream",   url: "..." }           → Fetch stream URLs
 *   { route: "download", url: "...", fs_id: N }  → Get download links
 * 
 * Supports: TeraBox + Google Drive
 */

const { authenticateFromContext, DB_ID } = require('../_shared/auth');
const { detectCloudSource, CLOUD_SOURCES, isValidCloudUrl, getSourceName } = require('../_shared/utils');
const { getMetadataCache, setMetadataCache, isMetadataFresh, checkRateLimit, markSlotExhausted, isSlotExhausted } = require('../_shared/redis');
const { fetchGDriveFile } = require('../_shared/gdrive');

// ============ Rate Limits ============
const LIMITS = {
    stream: { max: 30, window: 3600 },
    download: { max: 50, window: 3600 },
};

// ============ TeraBox API ============

async function getAvailableTeraBoxSlots() {
    const slots = [
        { id: 'standard_1', envName: 'TERABOX_API_KEY', endpoint: 'https://xapiverse.com/api/terabox' },
        { id: 'standard_2', envName: 'TERABOX_API_KEY_2', endpoint: 'https://xapiverse.com/api/terabox' },
        { id: 'standard_3', envName: 'TERABOX_API_KEY_3', endpoint: 'https://xapiverse.com/api/terabox' },
        { id: 'pro_1', envName: 'TERABOX_PRO_API_KEY', endpoint: 'https://xapiverse.com/api/terabox-pro' },
        { id: 'pro_2', envName: 'TERABOX_PRO_API_KEY_2', endpoint: 'https://xapiverse.com/api/terabox-pro' },
    ];

    const available = [];
    for (const slot of slots) {
        const key = process.env[slot.envName];
        if (!key) continue;
        const exhausted = await isSlotExhausted(slot.id);
        if (exhausted) continue;
        available.push({ id: slot.id, key, endpoint: slot.endpoint });
    }
    return available;
}

function isQuotaError(status, data) {
    if (status === 402 || status === 429) return true;
    const msg = JSON.stringify(data).toLowerCase();
    return msg.includes('insufficient') || msg.includes('quota') || msg.includes('balance') || msg.includes('credit');
}

async function fetchFromTeraBox(url) {
    const slots = await getAvailableTeraBoxSlots();
    if (slots.length === 0) {
        return { files: [], success: false, error: 'SERVICE_BUSY' };
    }

    for (const slot of slots) {
        try {
            const response = await fetch(slot.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xAPIverse-Key': slot.key,
                },
                body: JSON.stringify({ url }),
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                return { files: data.list || [], success: true, source: 'terabox' };
            }
            if (isQuotaError(response.status, data)) {
                console.warn(`Slot ${slot.id} exhausted`);
                await markSlotExhausted(slot.id);
                continue;
            }
            return { files: [], success: false, error: data.error || 'API error' };
        } catch (err) {
            console.error(`Slot ${slot.id} error:`, err.message);
            continue;
        }
    }
    return { files: [], success: false, error: 'SERVICE_BUSY' };
}

// ============ Multi-Source Fetch ============

async function fetchFromSource(sourceUrl) {
    const detected = detectCloudSource(sourceUrl);
    switch (detected.source) {
        case CLOUD_SOURCES.TERABOX:
            return fetchFromTeraBox(sourceUrl);
        case CLOUD_SOURCES.GOOGLE_DRIVE:
            return fetchGDriveFile(detected.fileId);
        default:
            return { files: [], success: false, error: 'Unsupported source' };
    }
}

// ============ Stream Handler ============

async function handleStream(context, body, auth) {
    const rl = await checkRateLimit(auth.user.id, 'streaming', LIMITS.stream.max, LIMITS.stream.window);
    if (!rl.allowed) {
        return context.res.json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 60)} min.` }, 429);
    }

    const sourceUrl = typeof body.url === 'string' ? body.url.trim() : '';
    if (!sourceUrl) return context.res.json({ error: 'URL is required' }, 400);
    if (!isValidCloudUrl(sourceUrl)) {
        return context.res.json({ error: 'Unsupported URL. Supported: TeraBox, Google Drive' }, 400);
    }

    const detected = detectCloudSource(sourceUrl);

    // Check cache
    if (!body.force) {
        const cached = await getMetadataCache(sourceUrl);
        if (cached && isMetadataFresh(cached)) {
            return context.res.json({
                status: 'success',
                source: getSourceName(detected.source),
                total_files: cached.files.length,
                list: cached.files,
                cached: true,
                cache_age_seconds: Math.floor((Date.now() - cached.fetchedAt) / 1000),
            });
        }
    }

    // Fetch fresh
    const result = await fetchFromSource(sourceUrl);
    if (!result.success) {
        if (result.error === 'SERVICE_BUSY') {
            return context.res.json({ error: 'SERVICE_BUSY', message: 'Servers at capacity. Try again shortly.' }, 503);
        }
        return context.res.json({ error: result.error }, 502);
    }

    await setMetadataCache(sourceUrl, result.files, auth.user.id);

    return context.res.json({
        status: 'success',
        source: getSourceName(detected.source),
        total_files: result.files.length,
        list: result.files,
        cached: false,
    });
}

// ============ Download Handler ============

async function handleDownload(context, body, auth) {
    const rl = await checkRateLimit(auth.user.id, 'download', LIMITS.download.max, LIMITS.download.window);
    if (!rl.allowed) {
        return context.res.json({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 60)} min.` }, 429);
    }

    const sourceUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const fileId = body.fs_id;
    if (!sourceUrl) return context.res.json({ error: 'URL is required' }, 400);
    if (!isValidCloudUrl(sourceUrl)) {
        return context.res.json({ error: 'Unsupported URL. Supported: TeraBox, Google Drive' }, 400);
    }

    const detected = detectCloudSource(sourceUrl);

    // Check cache
    if (!body.force) {
        const cached = await getMetadataCache(sourceUrl);
        if (cached && isMetadataFresh(cached)) {
            if (fileId) {
                const file = cached.files.find(f => f.fs_id === fileId || f.fs_id == fileId);
                if (file) {
                    trackDownload(auth.databases, auth.user.id, file);
                    return context.res.json({ status: 'success', file, cached: true });
                }
            }
            return context.res.json({
                status: 'success', source: getSourceName(detected.source),
                total_files: cached.files.length, list: cached.files, cached: true,
            });
        }
    }

    // Fetch fresh
    const result = await fetchFromSource(sourceUrl);
    if (!result.success) {
        if (result.error === 'SERVICE_BUSY') {
            return context.res.json({ error: 'SERVICE_BUSY', message: 'Servers at capacity.' }, 503);
        }
        return context.res.json({ error: result.error }, 502);
    }

    await setMetadataCache(sourceUrl, result.files, auth.user.id);

    if (fileId) {
        const file = result.files.find(f => f.fs_id === fileId || f.fs_id == fileId);
        if (file) {
            trackDownload(auth.databases, auth.user.id, file);
            return context.res.json({ status: 'success', file, cached: false });
        }
    }

    return context.res.json({
        status: 'success', source: getSourceName(detected.source),
        total_files: result.files.length, list: result.files, cached: false,
    });
}

// ============ Download Tracking ============

async function trackDownload(databases, userId, file) {
    try {
        const { ID } = require('node-appwrite');
        await databases.createDocument(DB_ID, 'download_history', ID.unique(), {
            user_id: userId,
            file_name: file.name,
            file_size: (file.size || 0).toString(),
            file_type: file.type || 'unknown',
            download_link: file.dlink || file.fast_download_link || file.download_link || '',
            source: file.source || 'terabox',
            status: 'initiated',
        });
    } catch (err) {
        console.warn('Track download failed:', err.message);
    }
}

// ============ Main Entry Point ============

module.exports = async (context) => {
    try {
        let body = {};
        try { body = JSON.parse(context.req.body || '{}'); } catch {
            return context.res.json({ error: 'Invalid JSON' }, 400);
        }

        const route = (body.route || 'stream').toLowerCase().trim();

        // Health check (no auth)
        if (route === 'ping' || route === 'health') {
            return context.res.json({ status: 'ok', service: 'cloud-service', supports: ['terabox', 'google_drive'] });
        }

        // Auth required for everything else
        const auth = await authenticateFromContext(context);
        if (!auth) return context.res.json({ error: 'Authentication required' }, 401);

        switch (route) {
            case 'stream':
            case 'streaming':
                return handleStream(context, body, auth);

            case 'download':
                return handleDownload(context, body, auth);

            default:
                return context.res.json({ error: `Unknown route: ${route}. Use: stream, download, ping` }, 404);
        }
    } catch (error) {
        console.error('Cloud service error:', error);
        return context.res.json({ error: 'Internal server error' }, 500);
    }
};
