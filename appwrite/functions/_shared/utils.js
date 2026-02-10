/**
 * Shared utilities for Appwrite Functions
 * - CORS headers
 * - Response helpers
 * - Cloud source detection (TeraBox + Google Drive)
 */

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-appwrite-project, x-appwrite-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function handleCors(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    return null;
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 500) {
    return jsonResponse({ error: message }, status);
}

// ============ Cloud Source Detection ============

/**
 * Supported cloud sources
 */
const CLOUD_SOURCES = {
    TERABOX: 'terabox',
    GOOGLE_DRIVE: 'google_drive',
    UNKNOWN: 'unknown',
};

/**
 * TeraBox domain patterns
 */
const TERABOX_DOMAINS = [
    'terabox.com',
    '1024terabox.com',
    'teraboxapp.com',
    '1024tera.com',
    'www.terabox.com',
    'dl.terabox.com',
];

/**
 * Google Drive URL patterns
 */
const GDRIVE_PATTERNS = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,          // /file/d/{id}
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,          // /open?id={id}
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,          // /uc?id={id}
    /docs\.google\.com\/.*\/d\/([a-zA-Z0-9_-]+)/,             // docs.google.com/*/d/{id}
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,   // /drive/folders/{id}
];

/**
 * Detect cloud source from a URL
 * Returns { source, fileId?, isFolder? }
 */
function detectCloudSource(url) {
    try {
        const parsed = new URL(url);

        // Check TeraBox
        if (TERABOX_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
            return { source: CLOUD_SOURCES.TERABOX, url, isFolder: false };
        }

        // Check Google Drive
        for (const pattern of GDRIVE_PATTERNS) {
            const match = url.match(pattern);
            if (match) {
                const fileId = match[1];
                const isFolder = url.includes('/folders/');
                return {
                    source: CLOUD_SOURCES.GOOGLE_DRIVE,
                    fileId,
                    url,
                    isFolder,
                };
            }
        }

        return { source: CLOUD_SOURCES.UNKNOWN, url };
    } catch {
        return { source: CLOUD_SOURCES.UNKNOWN, url };
    }
}

/**
 * Validate that a URL is from a supported cloud source
 */
function isValidCloudUrl(url) {
    const detected = detectCloudSource(url);
    return detected.source !== CLOUD_SOURCES.UNKNOWN;
}

/**
 * Get human-readable source name
 */
function getSourceName(source) {
    switch (source) {
        case CLOUD_SOURCES.TERABOX: return 'TeraBox';
        case CLOUD_SOURCES.GOOGLE_DRIVE: return 'Google Drive';
        default: return 'Unknown';
    }
}

module.exports = {
    corsHeaders,
    handleCors,
    jsonResponse,
    errorResponse,
    CLOUD_SOURCES,
    TERABOX_DOMAINS,
    GDRIVE_PATTERNS,
    detectCloudSource,
    isValidCloudUrl,
    getSourceName,
};
