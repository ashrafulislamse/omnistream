/**
 * Platform API — Appwrite Function #2
 * 
 * Routes:
 *   { route: "auth",      action: "validate|logout|profile|update-profile|health|role" }
 *   { route: "admin",     section: "overview|users|recent-activity|api-monitor", action?: "assign|remove|ban|unban" }
 *   { route: "extension", action: "health|auth-check|add-link|queue|stats" }
 *   { route: "storage",   action: "proxy|check|delete|stats" }
 *   { route: "link-health" }  (scheduled / manual trigger)
 */

const { authenticateFromContext, isUserAdmin, createAdminClient, DB_ID } = require('../_shared/auth');
const { checkRateLimit, isRedisHealthy, isSlotExhausted, cacheTtl, invalidateSessionCache, CACHE_PREFIX } = require('../_shared/redis');
const { isValidCloudUrl, detectCloudSource, getSourceName } = require('../_shared/utils');
const { Query, ID } = require('node-appwrite');

// ============================================================
//  AUTH HELPER
// ============================================================

async function handleAuth(context, body) {
    const action = body.action || 'validate';

    if (action === 'health') {
        const redisOk = await isRedisHealthy();
        return context.res.json({ status: 'ok', services: { auth: true, redis: redisOk } });
    }

    if (action === 'validate') {
        const auth = await authenticateFromContext(context);
        if (!auth) return context.res.json({ valid: false, error: 'Invalid session' }, 401);

        const [srl, drl] = await Promise.all([
            checkRateLimit(auth.user.id, 'streaming', 30, 3600),
            checkRateLimit(auth.user.id, 'download', 50, 3600),
        ]);

        return context.res.json({
            valid: true,
            user: { id: auth.user.id, email: auth.user.email },
            limits: {
                streaming: { remaining: srl.remaining, resetIn: srl.resetIn },
                download: { remaining: drl.remaining, resetIn: drl.resetIn },
            },
        });
    }

    if (action === 'logout') {
        const token = context.req.headers['authorization']?.replace('Bearer ', '');
        if (token) await invalidateSessionCache(token);
        return context.res.json({ success: true });
    }

    // All remaining actions require auth
    const auth = await authenticateFromContext(context);
    if (!auth) return context.res.json({ error: 'Authentication required' }, 401);

    if (action === 'profile') {
        const result = await auth.databases.listDocuments(DB_ID, 'profiles', [
            Query.equal('user_id', auth.user.id), Query.limit(1),
        ]);
        return context.res.json({ profile: result.documents[0] || null });
    }

    if (action === 'update-profile') {
        const updates = {};
        if (body.display_name) updates.display_name = body.display_name;
        if (body.avatar_url) updates.avatar_url = body.avatar_url;

        const existing = await auth.databases.listDocuments(DB_ID, 'profiles', [
            Query.equal('user_id', auth.user.id), Query.limit(1),
        ]);
        if (existing.documents.length > 0) {
            const doc = await auth.databases.updateDocument(DB_ID, 'profiles', existing.documents[0].$id, updates);
            return context.res.json({ profile: doc });
        }
        return context.res.json({ error: 'Profile not found' }, 404);
    }

    if (action === 'role') {
        const admin = await isUserAdmin(auth.user.id);
        return context.res.json({ isAdmin: admin });
    }

    if (action === 'redis-stats') {
        const admin = await isUserAdmin(auth.user.id);
        if (!admin) return context.res.json({ error: 'Admin access required' }, 403);

        const redisOk = await isRedisHealthy();
        const slotIds = ['standard_1', 'standard_2', 'standard_3', 'pro_1', 'pro_2'];
        const apiSlots = await Promise.all(
            slotIds.map(async (id) => {
                const exhausted = await isSlotExhausted(id);
                const cooldown = exhausted ? await cacheTtl(`${CACHE_PREFIX.API_SLOT}${id}`) : 0;
                return { id, exhausted, cooldownRemaining: exhausted ? cooldown : undefined };
            })
        );
        return context.res.json({ connected: redisOk, apiSlots, lastUpdated: Date.now() });
    }

    return context.res.json({ error: `Unknown auth action: ${action}` }, 400);
}

// ============================================================
//  ADMIN STATS
// ============================================================

async function handleAdmin(context, body) {
    const auth = await authenticateFromContext(context);
    if (!auth) return context.res.json({ error: 'Unauthorized' }, 401);
    const admin = await isUserAdmin(auth.user.id);
    if (!admin) return context.res.json({ error: 'Forbidden' }, 403);

    const { databases, users } = createAdminClient();
    const section = body.section || 'overview';
    const action = body.action;

    // ---- POST actions: role / ban management ----
    if (action) {
        const { targetUserId, role } = body;
        if (!['assign', 'remove', 'ban', 'unban'].includes(action)) return context.res.json({ error: 'Invalid action' }, 400);
        if (!targetUserId) return context.res.json({ error: 'Missing target user' }, 400);

        if (action === 'ban' || action === 'unban') {
            if (targetUserId === auth.user.id) return context.res.json({ error: 'Cannot ban yourself' }, 400);
            await users.updateStatus(targetUserId, action === 'unban');
            return context.res.json({ success: true });
        }

        if (!['admin', 'moderator', 'user'].includes(role)) return context.res.json({ error: 'Invalid role' }, 400);
        if (targetUserId === auth.user.id && action === 'remove' && role === 'admin') {
            return context.res.json({ error: 'Cannot remove own admin role' }, 400);
        }

        if (action === 'assign') {
            const existing = await databases.listDocuments(DB_ID, 'user_roles', [
                Query.equal('user_id', targetUserId), Query.equal('role', role),
            ]);
            if (existing.documents.length === 0) {
                await databases.createDocument(DB_ID, 'user_roles', ID.unique(), { user_id: targetUserId, role });
            }
        } else {
            const existing = await databases.listDocuments(DB_ID, 'user_roles', [
                Query.equal('user_id', targetUserId), Query.equal('role', role),
            ]);
            for (const doc of existing.documents) {
                await databases.deleteDocument(DB_ID, 'user_roles', doc.$id);
            }
        }
        return context.res.json({ success: true });
    }

    // ---- GET: Stats sections ----
    const count = async (col, filters = []) => {
        try { const r = await databases.listDocuments(DB_ID, col, [...filters, Query.limit(1)]); return r.total; } catch { return 0; }
    };

    if (section === 'overview') {
        const d24h = new Date(Date.now() - 86400000).toISOString();
        const d7d = new Date(Date.now() - 604800000).toISOString();

        const [totalUsers, totalDl, totalFav, totalFetched, totalShared, totalCached,
            dl24, fetch24, dl7, fetch7, users7, fav24, shares24] = await Promise.all([
                count('profiles'), count('download_history'), count('favorites'),
                count('fetched_files'), count('shared_links'), count('shared_cache'),
                count('download_history', [Query.greaterThan('$createdAt', d24h)]),
                count('fetched_files', [Query.greaterThan('$createdAt', d24h)]),
                count('download_history', [Query.greaterThan('$createdAt', d7d)]),
                count('fetched_files', [Query.greaterThan('$createdAt', d7d)]),
                count('profiles', [Query.greaterThan('$createdAt', d7d)]),
                count('favorites', [Query.greaterThan('$createdAt', d24h)]),
                count('shared_links', [Query.greaterThan('$createdAt', d24h)]),
            ]);

        return context.res.json({
            totalUsers, totalDownloads: totalDl, totalFavorites: totalFav,
            totalFetchedFiles: totalFetched, totalSharedLinks: totalShared, totalCachedEntries: totalCached,
            last24h: { downloads: dl24, fetches: fetch24, favorites: fav24, shares: shares24 },
            last7d: { downloads: dl7, fetches: fetch7, newUsers: users7 },
        });
    }

    if (section === 'users') {
        const profiles = await databases.listDocuments(DB_ID, 'profiles', [Query.orderDesc('$createdAt'), Query.limit(100)]);
        const roles = await databases.listDocuments(DB_ID, 'user_roles', [Query.limit(500)]);
        const userRoles = {};
        roles.documents.forEach(r => { if (!userRoles[r.user_id]) userRoles[r.user_id] = []; userRoles[r.user_id].push(r.role); });

        return context.res.json(profiles.documents.map(p => ({
            id: p.user_id || p.$id, display_name: p.display_name, avatar_url: p.avatar_url,
            created_at: p.$createdAt, roles: userRoles[p.user_id || p.$id] || [],
        })));
    }

    if (section === 'recent-activity') {
        const [downloads, fetches] = await Promise.all([
            databases.listDocuments(DB_ID, 'download_history', [Query.orderDesc('$createdAt'), Query.limit(50)]),
            databases.listDocuments(DB_ID, 'fetched_files', [Query.orderDesc('$createdAt'), Query.limit(50)]),
        ]);
        return context.res.json({ recentDownloads: downloads.documents, recentFetches: fetches.documents });
    }

    if (section === 'api-monitor') {
        const allSlots = [
            { name: 'TERABOX_API_KEY', label: 'Standard Key 1', type: 'standard' },
            { name: 'TERABOX_API_KEY_2', label: 'Standard Key 2', type: 'standard' },
            { name: 'TERABOX_API_KEY_3', label: 'Standard Key 3', type: 'standard' },
            { name: 'TERABOX_PRO_API_KEY', label: 'Pro Key 1', type: 'pro' },
            { name: 'TERABOX_PRO_API_KEY_2', label: 'Pro Key 2', type: 'pro' },
            { name: 'GOOGLE_API_KEY', label: 'Google Drive', type: 'gdrive' },
        ];

        const keyChecks = await Promise.all(allSlots.map(async (slot) => {
            const configured = !!process.env[slot.name];
            let status = configured ? 'active' : 'not_configured';
            if (configured && slot.type !== 'gdrive') {
                const exhausted = await isSlotExhausted(slot.name.toLowerCase());
                if (exhausted) status = 'exhausted';
            }
            return { ...slot, configured, status };
        }));

        return context.res.json({
            keys: keyChecks,
            configuredCount: keyChecks.filter(k => k.configured).length,
            activeCount: keyChecks.filter(k => k.status === 'active').length,
        });
    }

    return context.res.json({ error: 'Unknown section' }, 400);
}

// ============================================================
//  EXTENSION API
// ============================================================

async function handleExtension(context, body) {
    const action = body.action || 'health';

    if (action === 'health') {
        return context.res.json({ status: 'ok', version: '2.0.0', supports: ['terabox', 'google_drive'] });
    }

    if (action === 'auth-check') {
        const auth = await authenticateFromContext(context);
        if (!auth) return context.res.json({ authenticated: false }, 401);
        return context.res.json({ authenticated: true, user: { id: auth.user.id, email: auth.user.email } });
    }

    const auth = await authenticateFromContext(context);
    if (!auth) return context.res.json({ error: 'Unauthorized' }, 401);

    if (action === 'add-link') {
        if (!body.url) return context.res.json({ error: 'URL required' }, 400);
        if (!isValidCloudUrl(body.url)) {
            return context.res.json({ error: 'Unsupported URL. Supported: TeraBox, Google Drive' }, 400);
        }
        const rl = await checkRateLimit(auth.user.id, 'ext_add', 10, 60);
        if (!rl.allowed) return context.res.json({ error: 'Rate limit exceeded' }, 429);

        const detected = detectCloudSource(body.url);
        await auth.databases.createDocument(DB_ID, 'fetched_files', ID.unique(), {
            user_id: auth.user.id, source_url: body.url,
            file_data: JSON.stringify({ pending: true, title: body.title || null, source: detected.source }),
            file_count: 0,
        });
        return context.res.json({ success: true, source: getSourceName(detected.source), url: body.url });
    }

    if (action === 'queue') {
        const result = await auth.databases.listDocuments(DB_ID, 'fetched_files', [
            Query.equal('user_id', auth.user.id), Query.orderDesc('$createdAt'), Query.limit(20),
        ]);
        return context.res.json({
            queue: result.documents.map(link => {
                let fd = {}; try { fd = JSON.parse(link.file_data || '{}'); } catch { }
                return {
                    id: link.$id, url: link.source_url, title: fd.title, source: fd.source || 'terabox',
                    status: link.file_count === 0 ? 'pending' : 'done', created_at: link.$createdAt
                };
            })
        });
    }

    if (action === 'stats') {
        const [fav, hist] = await Promise.all([
            auth.databases.listDocuments(DB_ID, 'favorites', [Query.equal('user_id', auth.user.id), Query.limit(1)]),
            auth.databases.listDocuments(DB_ID, 'download_history', [Query.equal('user_id', auth.user.id), Query.limit(1)]),
        ]);
        return context.res.json({ favorites: fav.total, downloads: hist.total });
    }

    return context.res.json({ error: 'Unknown action' }, 404);
}

// ============================================================
//  STORAGE / THUMBNAIL PROXY
// ============================================================

async function handleStorage(context, body) {
    const { Storage, InputFile } = require('node-appwrite');
    const { createHash } = require('crypto');
    const { getThumbnailCache, setThumbnailCache } = require('../_shared/redis');

    const { client } = createAdminClient();
    const storage = new Storage(client);
    const BUCKET_ID = process.env.THUMBNAIL_BUCKET_ID || 'thumbnails';
    const action = body.action || 'proxy';
    const urlToKey = (url) => createHash('sha256').update(url).digest('hex').slice(0, 32);

    if (action === 'proxy') {
        const urls = Array.isArray(body.urls) ? body.urls.filter(u => typeof u === 'string' && u.startsWith('http'))
            : typeof body.url === 'string' ? [body.url] : [];
        if (urls.length === 0) return context.res.json({ error: 'No URLs' }, 400);

        const results = {};
        await Promise.all(urls.slice(0, 20).map(async (originalUrl) => {
            try {
                const cached = await getThumbnailCache(originalUrl);
                if (cached) { results[originalUrl] = cached; return; }

                const key = urlToKey(originalUrl);
                const fileId = `thumb_${key}`;

                try {
                    await storage.getFile(BUCKET_ID, fileId);
                    const viewUrl = `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_FUNCTION_PROJECT_ID}`;
                    await setThumbnailCache(originalUrl, viewUrl);
                    results[originalUrl] = viewUrl;
                    return;
                } catch { }

                const resp = await fetch(originalUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmniStream/2.0)', Referer: 'https://www.terabox.com/' },
                });
                if (!resp.ok) return;

                const buffer = Buffer.from(await resp.arrayBuffer());
                await storage.createFile(BUCKET_ID, fileId, InputFile.fromBuffer(buffer, `${key}.jpg`));
                const viewUrl = `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_FUNCTION_PROJECT_ID}`;
                await setThumbnailCache(originalUrl, viewUrl);
                results[originalUrl] = viewUrl;
            } catch (e) { console.warn('Thumb proxy error:', e.message); }
        }));
        return context.res.json({ results });
    }

    if (action === 'stats') {
        try {
            const files = await storage.listFiles(BUCKET_ID, [Query.limit(1000)]);
            const totalSize = files.files.reduce((a, f) => a + (f.sizeOriginal || 0), 0);
            return context.res.json({ bucket: BUCKET_ID, totalFiles: files.total, totalSizeMB: (totalSize / 1048576).toFixed(2) });
        } catch { return context.res.json({ error: 'Failed' }, 500); }
    }

    return context.res.json({ error: 'Unknown storage action' }, 400);
}

// ============================================================
//  LINK HEALTH CHECK (Scheduled)
// ============================================================

async function handleLinkHealth(context) {
    const { databases } = createAdminClient();

    const favorites = await databases.listDocuments(DB_ID, 'favorites', [
        Query.isNotNull('source_url'), Query.limit(500),
    ]);
    if (favorites.documents.length === 0) {
        return context.res.json({ checked: 0, message: 'No favorites' });
    }

    let checked = 0, broken = 0;
    for (const fav of favorites.documents) {
        const testUrl = fav.fast_download_link || fav.download_link || fav.stream_url;
        let status = 'healthy', lastError = null;

        if (!testUrl) { status = 'unknown'; lastError = 'No link'; }
        else {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 10000);
                const r = await fetch(testUrl, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
                clearTimeout(t);
                if ([403, 404, 410].includes(r.status)) { status = 'expired'; lastError = `HTTP ${r.status}`; }
                else if (!r.ok) { status = 'broken'; lastError = `HTTP ${r.status}`; }
            } catch (err) { status = 'unknown'; lastError = err.message; }
        }
        if (status !== 'healthy') broken++;

        try {
            const existing = await databases.listDocuments(DB_ID, 'link_health', [Query.equal('favorite_id', fav.$id), Query.limit(1)]);
            if (existing.documents.length > 0) {
                await databases.updateDocument(DB_ID, 'link_health', existing.documents[0].$id, {
                    status, last_checked_at: new Date().toISOString(),
                    fail_count: status === 'healthy' ? 0 : (existing.documents[0].fail_count || 0) + 1,
                    last_error: lastError,
                });
            } else {
                await databases.createDocument(DB_ID, 'link_health', ID.unique(), {
                    favorite_id: fav.$id, user_id: fav.user_id, source_url: fav.source_url,
                    status, fail_count: status === 'healthy' ? 0 : 1, last_error: lastError,
                });
            }
        } catch { }
        checked++;
    }
    return context.res.json({ checked, broken, message: 'Done' });
}

// ============================================================
//  MAIN ROUTER
// ============================================================

module.exports = async (context) => {
    try {
        let body = {};
        try { body = JSON.parse(context.req.body || '{}'); } catch {
            return context.res.json({ error: 'Invalid JSON' }, 400);
        }

        const route = (body.route || '').toLowerCase().trim();

        switch (route) {
            case 'auth': return handleAuth(context, body);
            case 'admin': return handleAdmin(context, body);
            case 'extension': return handleExtension(context, body);
            case 'storage':
            case 'thumbnail': return handleStorage(context, body);
            case 'link-health': return handleLinkHealth(context);

            case 'ping':
            case 'health':
                return context.res.json({ status: 'ok', service: 'platform-api', version: '2.0.0' });

            default:
                return context.res.json({
                    error: `Unknown route: "${route}"`,
                    available: ['auth', 'admin', 'extension', 'storage', 'link-health', 'ping'],
                }, 404);
        }
    } catch (error) {
        console.error('Platform API error:', error);
        return context.res.json({ error: 'Internal server error' }, 500);
    }
};
