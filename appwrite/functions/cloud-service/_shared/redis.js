/**
 * Shared Redis caching layer using Upstash REST API
 * Migrated from Deno to Node.js for Appwrite Functions
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command) {
    if (!REDIS_URL || !REDIS_TOKEN) {
        console.warn('Redis not configured, skipping cache operation');
        return null;
    }

    try {
        const response = await fetch(REDIS_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
        });

        if (!response.ok) {
            console.error('Redis error:', response.status);
            return null;
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Redis command failed:', error);
        return null;
    }
}

// ============ Cache Prefixes ============
const CACHE_PREFIX = {
    METADATA: 'meta:',
    SESSION: 'session:',
    RATE_LIMIT: 'rl:',
    THUMBNAIL: 'thumb:',
    API_SLOT: 'apiSlot:',
};

// ============ TTL Constants (seconds) ============
const TTL = {
    METADATA: 4 * 60 * 60,       // 4 hours
    FRESH_THRESHOLD: 30 * 60,    // 30 minutes
    SESSION: 24 * 60 * 60,       // 24 hours
    RATE_LIMIT: 60 * 60,         // 1 hour
    THUMBNAIL: 7 * 24 * 60 * 60, // 7 days
    API_COOLDOWN: 30 * 60,       // 30 min
};

// ============ Generic Cache Operations ============

async function cacheGet(key) {
    const result = await redisCommand(['GET', key]);
    if (!result) return null;
    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}

async function cacheSet(key, value, ttlSeconds) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const result = await redisCommand(['SET', key, serialized, 'EX', ttlSeconds.toString()]);
    return result === 'OK';
}

async function cacheDel(key) {
    const result = await redisCommand(['DEL', key]);
    return result === 1;
}

async function cacheExists(key) {
    const result = await redisCommand(['EXISTS', key]);
    return result === 1;
}

async function cacheTtl(key) {
    const result = await redisCommand(['TTL', key]);
    return result ?? -1;
}

async function cacheIncr(key) {
    const result = await redisCommand(['INCR', key]);
    return result ?? 0;
}

async function cacheExpire(key, ttlSeconds) {
    const result = await redisCommand(['EXPIRE', key, ttlSeconds.toString()]);
    return result === 1;
}

// ============ Metadata Cache ============

async function getMetadataCache(sourceUrl) {
    const key = `${CACHE_PREFIX.METADATA}${normalizeUrl(sourceUrl)}`;
    return cacheGet(key);
}

async function setMetadataCache(sourceUrl, files, userId) {
    const key = `${CACHE_PREFIX.METADATA}${normalizeUrl(sourceUrl)}`;
    return cacheSet(key, { files, fetchedAt: Date.now(), userId }, TTL.METADATA);
}

function isMetadataFresh(cached) {
    return Date.now() - cached.fetchedAt < TTL.FRESH_THRESHOLD * 1000;
}

// ============ Rate Limiting ============

async function checkRateLimit(userId, action, maxRequests, windowSeconds = TTL.RATE_LIMIT) {
    const key = `${CACHE_PREFIX.RATE_LIMIT}${action}:${userId}`;
    const current = await cacheGet(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= maxRequests) {
        const ttl = await cacheTtl(key);
        return { allowed: false, remaining: 0, resetIn: ttl > 0 ? ttl : windowSeconds };
    }

    const newCount = await cacheIncr(key);
    if (newCount === 1) {
        await cacheExpire(key, windowSeconds);
    }

    const ttl = await cacheTtl(key);
    return {
        allowed: true,
        remaining: Math.max(0, maxRequests - newCount),
        resetIn: ttl > 0 ? ttl : windowSeconds,
    };
}

// ============ API Slot Management ============

async function markSlotExhausted(slotId) {
    const key = `${CACHE_PREFIX.API_SLOT}${slotId}`;
    await cacheSet(key, Date.now().toString(), TTL.API_COOLDOWN);
}

async function isSlotExhausted(slotId) {
    const key = `${CACHE_PREFIX.API_SLOT}${slotId}`;
    return cacheExists(key);
}

// ============ Session Cache ============

async function setSessionCache(token, session) {
    const key = `${CACHE_PREFIX.SESSION}${hashToken(token)}`;
    return cacheSet(key, session, TTL.SESSION);
}

async function getSessionCache(token) {
    const key = `${CACHE_PREFIX.SESSION}${hashToken(token)}`;
    return cacheGet(key);
}

async function invalidateSessionCache(token) {
    const key = `${CACHE_PREFIX.SESSION}${hashToken(token)}`;
    return cacheDel(key);
}

// ============ Thumbnail Cache ============

async function setThumbnailCache(originalUrl, storedUrl) {
    const key = `${CACHE_PREFIX.THUMBNAIL}${await hashUrl(originalUrl)}`;
    return cacheSet(key, storedUrl, TTL.THUMBNAIL);
}

async function getThumbnailCache(originalUrl) {
    const key = `${CACHE_PREFIX.THUMBNAIL}${await hashUrl(originalUrl)}`;
    return cacheGet(key);
}

// ============ Health Check ============

async function isRedisHealthy() {
    const result = await redisCommand(['PING']);
    return result === 'PONG';
}

// ============ Helpers ============

function normalizeUrl(url) {
    return url.trim().toLowerCase();
}

function hashToken(token) {
    return Buffer.from(token).toString('base64').slice(0, 16);
}

async function hashUrl(url) {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(url).digest('hex').slice(0, 32);
}

module.exports = {
    CACHE_PREFIX,
    TTL,
    cacheGet,
    cacheSet,
    cacheDel,
    cacheExists,
    cacheTtl,
    cacheIncr,
    cacheExpire,
    getMetadataCache,
    setMetadataCache,
    isMetadataFresh,
    checkRateLimit,
    markSlotExhausted,
    isSlotExhausted,
    setSessionCache,
    getSessionCache,
    invalidateSessionCache,
    setThumbnailCache,
    getThumbnailCache,
    isRedisHealthy,
};
