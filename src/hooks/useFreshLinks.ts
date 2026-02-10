import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TeraBoxFile, TeraBoxResponse } from "@/types/terabox";
import { useToast } from "@/hooks/use-toast";
import { useSharedCache } from "@/hooks/useSharedCache";

/**
 * Smart link management with lazy refresh.
 *
 * Strategy:
 * 1. If we have a cached link (from a recent API call), use it immediately — no API call.
 * 2. If there's no cache, fetch fresh links from the API.
 * 3. Expose a `tryLinkOrRefresh` helper that tries a URL first (HEAD request),
 *    and only re-fetches if the link is dead (403/404/network error).
 *
 * This minimizes API usage: replaying a video 5 min later uses the cache,
 * and only triggers a new fetch when links actually expire.
 */

interface CacheEntry {
  files: TeraBoxFile[];
  timestamp: number;
}

const linkCache = new Map<string, CacheEntry>();
// We keep a generous TTL — links stay in cache until manually evicted or this expires.
// The real expiry detection happens via tryLinkOrRefresh.
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours max cache (safety net)

// In-flight dedup
const inflight = new Map<string, Promise<TeraBoxFile[]>>();

export function useFreshLinks() {
  const { toast } = useToast();
  const { getFromSharedCache, saveToSharedCache } = useSharedCache();
  const [fetchingUrls, setFetchingUrls] = useState<Set<string>>(new Set());

  const isFetching = fetchingUrls.size > 0;
  const isFetchingUrl = useCallback((url: string) => fetchingUrls.has(url.trim().toLowerCase()), [fetchingUrls]);

  /** Seed the in-memory cache from database entries (avoids API calls after refresh). */
  const seedCache = useCallback((entries: { source_url: string; files: any[]; created_at: string }[]) => {
    for (const entry of entries) {
      const key = entry.source_url.trim().toLowerCase();
      if (!linkCache.has(key)) {
        const savedAt = new Date(entry.created_at).getTime();
        if (Date.now() - savedAt < CACHE_TTL) {
          linkCache.set(key, { files: entry.files, timestamp: savedAt });
        }
      }
    }
  }, []);

  /** Force-fetch fresh links from the API (always calls API), then saves to shared cache. */
  const fetchFromApi = useCallback(async (sourceUrl: string): Promise<TeraBoxFile[]> => {
    // Try the new streaming service first (with Redis caching)
    try {
      const { data: streamData, error: streamError } = await supabase.functions.invoke("streaming-service", {
        body: { url: sourceUrl, force: true },
      });

      if (!streamError && streamData?.status === "success" && streamData?.list?.length) {
        const files = streamData.list as TeraBoxFile[];
        // Also save to shared cache for other users
        saveToSharedCache(sourceUrl, files).catch(() => {});
        return files;
      }
    } catch {
      // Fall back to legacy terabox-proxy
    }

    // Fallback to legacy terabox-proxy
    const { data: result, error } = await supabase.functions.invoke("terabox-proxy", {
      body: { url: sourceUrl },
    });

    if (error) throw new Error(error.message || "Failed to fetch fresh links");
    if (result?.error) throw new Error(result.error);
    if (result?.status !== "success" || !result?.list?.length) {
      throw new Error("No files returned from API");
    }

    const files = result.list as TeraBoxFile[];
    // Save to shared cache for other users
    saveToSharedCache(sourceUrl, files).catch(() => {});
    return files;
  }, [saveToSharedCache]);

  /** Fetch links — uses cache if available, otherwise calls API. */
  const refetch = useCallback(async (sourceUrl: string, forceRefresh = false): Promise<TeraBoxFile[] | null> => {
    const key = sourceUrl.trim().toLowerCase();

    // Check in-memory cache (unless forced)
    if (!forceRefresh) {
      const cached = linkCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.files;
      }

      // Check shared DB cache (cross-user)
      try {
        const shared = await getFromSharedCache(sourceUrl);
        if (shared?.list?.length) {
          linkCache.set(key, { files: shared.list, timestamp: Date.now() });
          return shared.list;
        }
      } catch {}
    }

    // Dedup in-flight
    const existing = inflight.get(key);
    if (existing) return existing;

    setFetchingUrls((prev) => new Set(prev).add(key));

    const promise = fetchFromApi(sourceUrl);
    inflight.set(key, promise);

    try {
      const files = await promise;
      linkCache.set(key, { files, timestamp: Date.now() });
      return files;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get fresh links";
      toast({ title: "Re-fetch failed", description: msg, variant: "destructive" });
      return null;
    } finally {
      inflight.delete(key);
      setFetchingUrls((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [toast, fetchFromApi]);

  /** Force refresh — always calls the API, evicts cache. */
  const forceRefresh = useCallback(async (sourceUrl: string): Promise<TeraBoxFile[] | null> => {
    const key = sourceUrl.trim().toLowerCase();
    linkCache.delete(key);
    return refetch(sourceUrl, true);
  }, [refetch]);

  /**
   * Get a fresh file by matching fs_id or name from a source URL.
   * Uses cache when possible.
   */
  const getFreshFile = useCallback(async (
    sourceUrl: string,
    match: { fs_id?: number; name?: string }
  ): Promise<TeraBoxFile | null> => {
    const files = await refetch(sourceUrl);
    if (!files) return null;

    const found = files.find((f) =>
      (match.fs_id && f.fs_id === match.fs_id) || (match.name && f.name === match.name)
    );

    return found ?? files[0] ?? null;
  }, [refetch]);

  /**
   * Smart link resolver with cache-age strategy + graceful fallback.
   * - If we have recent cached links (< 30 min), use them instantly (no API call).
   * - If cache is older or missing, try to fetch fresh links from API.
   * - If API fails (SERVICE_BUSY, etc.), fall back to existing cached/stored links.
   * This avoids both unnecessary API calls AND broken/expired link buffering,
   * while ensuring playback still works when the API is temporarily unavailable.
   */
  const FRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes — links younger than this are trusted

  const getWorkingFile = useCallback(async (
    sourceUrl: string,
    currentFile: TeraBoxFile,
  ): Promise<TeraBoxFile | null> => {
    const key = sourceUrl.trim().toLowerCase();
    const cached = linkCache.get(key);
    const cacheAge = cached ? Date.now() - cached.timestamp : null;

    // If cache is recent enough, trust it without any network check
    if (cached && cacheAge !== null && cacheAge < FRESH_THRESHOLD) {
      const found = cached.files.find((f) =>
        (currentFile.fs_id && f.fs_id === currentFile.fs_id) || f.name === currentFile.name
      );
      if (found) return found;
      return cached.files[0] ?? null;
    }

    // Cache is stale or missing — try to refresh from API
    try {
      const freshFiles = await forceRefresh(sourceUrl);
      if (freshFiles) {
        const found = freshFiles.find((f) =>
          (currentFile.fs_id && f.fs_id === currentFile.fs_id) || f.name === currentFile.name
        );
        return found ?? freshFiles[0] ?? null;
      }
    } catch (err) {
      // API failed (SERVICE_BUSY, rate limit, network error, etc.)
      console.warn("API refresh failed, falling back to cached links:", err);
    }

    // FALLBACK: If API failed but we have older cached links, use them
    // Better to try potentially-stale links than show nothing
    if (cached) {
      const found = cached.files.find((f) =>
        (currentFile.fs_id && f.fs_id === currentFile.fs_id) || f.name === currentFile.name
      );
      if (found) return found;
      return cached.files[0] ?? null;
    }

    // Last resort: return the currentFile itself — it has stream URLs from DB
    // This allows playback with stored links even when API is completely unavailable
    if (currentFile.stream_url || currentFile.fast_stream_url) {
      return currentFile;
    }

    return null;
  }, [forceRefresh]);

  /** Get the cached timestamp for a source URL (ms since epoch), or null if not cached. */
  const getCacheTime = useCallback((sourceUrl: string): number | null => {
    const key = sourceUrl.trim().toLowerCase();
    const cached = linkCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.timestamp;
    }
    return null;
  }, []);

  return { refetch, forceRefresh, getFreshFile, getWorkingFile, isFetching, isFetchingUrl, getCacheTime, seedCache };
}
