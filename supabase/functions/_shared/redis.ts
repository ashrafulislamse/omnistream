/**
 * Shared Redis caching layer using Upstash REST API.
 * Used across all microservices for:
 * - File metadata caching
 * - Session caching
 * - Rate limiting
 * - Thumbnail URL caching
 */

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

interface RedisResponse<T = unknown> {
  result: T;
}

async function redisCommand<T = unknown>(command: string[]): Promise<T | null> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn("Redis not configured, skipping cache operation");
    return null;
  }

  try {
    const response = await fetch(`${REDIS_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      console.error("Redis error:", response.status);
      return null;
    }

    const data: RedisResponse<T> = await response.json();
    return data.result;
  } catch (error) {
    console.error("Redis command failed:", error);
    return null;
  }
}

// ============ Cache Prefixes ============
export const CACHE_PREFIX = {
  METADATA: "meta:",      // File metadata from TeraBox API
  SESSION: "session:",    // User session data
  RATE_LIMIT: "rl:",      // Rate limiting counters
  THUMBNAIL: "thumb:",    // Thumbnail URL mappings
  API_SLOT: "apiSlot:",   // API key exhaustion tracking
};

// ============ TTL Constants ============
export const TTL = {
  METADATA: 4 * 60 * 60,      // 4 hours for file metadata
  FRESH_THRESHOLD: 30 * 60,   // 30 minutes - links younger than this are trusted
  SESSION: 24 * 60 * 60,      // 24 hours for sessions
  RATE_LIMIT: 60 * 60,        // 1 hour rate limit window
  THUMBNAIL: 7 * 24 * 60 * 60,// 7 days for thumbnail mappings
  API_COOLDOWN: 30 * 60,      // 30 min cooldown for exhausted API keys
};

// ============ Generic Cache Operations ============

/** Get a value from cache */
export async function cacheGet<T = string>(key: string): Promise<T | null> {
  const result = await redisCommand<string>(["GET", key]);
  if (!result) return null;
  
  try {
    return JSON.parse(result) as T;
  } catch {
    return result as T;
  }
}

/** Set a value in cache with TTL */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  const result = await redisCommand<string>(["SET", key, serialized, "EX", ttlSeconds.toString()]);
  return result === "OK";
}

/** Delete a key from cache */
export async function cacheDel(key: string): Promise<boolean> {
  const result = await redisCommand<number>(["DEL", key]);
  return result === 1;
}

/** Check if a key exists */
export async function cacheExists(key: string): Promise<boolean> {
  const result = await redisCommand<number>(["EXISTS", key]);
  return result === 1;
}

/** Get TTL of a key in seconds */
export async function cacheTtl(key: string): Promise<number> {
  const result = await redisCommand<number>(["TTL", key]);
  return result ?? -1;
}

/** Increment a counter (for rate limiting) */
export async function cacheIncr(key: string): Promise<number> {
  const result = await redisCommand<number>(["INCR", key]);
  return result ?? 0;
}

/** Set expiry on existing key */
export async function cacheExpire(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await redisCommand<number>(["EXPIRE", key, ttlSeconds.toString()]);
  return result === 1;
}

// ============ Metadata Cache ============

export interface CachedMetadata {
  files: unknown[];
  fetchedAt: number;
  userId?: string;
}

/** Get cached file metadata for a source URL */
export async function getMetadataCache(sourceUrl: string): Promise<CachedMetadata | null> {
  const key = `${CACHE_PREFIX.METADATA}${normalizeUrl(sourceUrl)}`;
  return cacheGet<CachedMetadata>(key);
}

/** Set file metadata in cache */
export async function setMetadataCache(
  sourceUrl: string, 
  files: unknown[], 
  userId?: string
): Promise<boolean> {
  const key = `${CACHE_PREFIX.METADATA}${normalizeUrl(sourceUrl)}`;
  const data: CachedMetadata = {
    files,
    fetchedAt: Date.now(),
    userId,
  };
  return cacheSet(key, data, TTL.METADATA);
}

/** Check if metadata is fresh (less than 30 min old) */
export function isMetadataFresh(cached: CachedMetadata): boolean {
  return Date.now() - cached.fetchedAt < TTL.FRESH_THRESHOLD * 1000;
}

// ============ Rate Limiting ============

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/** Check and increment rate limit for a user/action */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number = TTL.RATE_LIMIT
): Promise<RateLimitResult> {
  const key = `${CACHE_PREFIX.RATE_LIMIT}${action}:${userId}`;
  
  // Get current count
  const current = await cacheGet<string>(key);
  const count = current ? parseInt(current, 10) : 0;
  
  if (count >= maxRequests) {
    const ttl = await cacheTtl(key);
    return { allowed: false, remaining: 0, resetIn: ttl > 0 ? ttl : windowSeconds };
  }
  
  // Increment counter
  const newCount = await cacheIncr(key);
  
  // Set expiry on first request
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

/** Mark an API slot as exhausted */
export async function markSlotExhausted(slotId: string): Promise<void> {
  const key = `${CACHE_PREFIX.API_SLOT}${slotId}`;
  await cacheSet(key, Date.now().toString(), TTL.API_COOLDOWN);
}

/** Check if an API slot is in cooldown */
export async function isSlotExhausted(slotId: string): Promise<boolean> {
  const key = `${CACHE_PREFIX.API_SLOT}${slotId}`;
  return cacheExists(key);
}

// ============ Session Cache ============

export interface CachedSession {
  userId: string;
  email?: string;
  role?: string;
  cachedAt: number;
}

/** Cache a user session */
export async function setSessionCache(token: string, session: CachedSession): Promise<boolean> {
  const key = `${CACHE_PREFIX.SESSION}${hashToken(token)}`;
  return cacheSet(key, session, TTL.SESSION);
}

/** Get a cached session */
export async function getSessionCache(token: string): Promise<CachedSession | null> {
  const key = `${CACHE_PREFIX.SESSION}${hashToken(token)}`;
  return cacheGet<CachedSession>(key);
}

/** Invalidate a session cache */
export async function invalidateSessionCache(token: string): Promise<boolean> {
  const key = `${CACHE_PREFIX.SESSION}${hashToken(token)}`;
  return cacheDel(key);
}

// ============ Thumbnail Cache ============

/** Cache a thumbnail URL mapping */
export async function setThumbnailCache(originalUrl: string, storedUrl: string): Promise<boolean> {
  const key = `${CACHE_PREFIX.THUMBNAIL}${await hashUrl(originalUrl)}`;
  return cacheSet(key, storedUrl, TTL.THUMBNAIL);
}

/** Get a cached thumbnail URL */
export async function getThumbnailCache(originalUrl: string): Promise<string | null> {
  const key = `${CACHE_PREFIX.THUMBNAIL}${await hashUrl(originalUrl)}`;
  return cacheGet<string>(key);
}

// ============ Helpers ============

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase();
}

function hashToken(token: string): string {
  // Simple hash for session keys (first 16 chars of base64)
  return btoa(token).slice(0, 16);
}

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ============ Health Check ============

/** Check if Redis is connected and working */
export async function isRedisHealthy(): Promise<boolean> {
  const result = await redisCommand<string>(["PING"]);
  return result === "PONG";
}
