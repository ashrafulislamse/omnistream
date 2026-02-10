import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TeraBoxFile, TeraBoxResponse } from "@/types/terabox";

const cache = new Map<string, { data: TeraBoxResponse; timestamp: number }>();
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours (match shared cache)

/** Seed cache from DB data (e.g. fetched_files table). Call on app init. */
export function seedCache(entries: { source_url: string; files: TeraBoxFile[]; created_at: string }[]) {
  for (const entry of entries) {
    const key = entry.source_url.trim().toLowerCase();
    if (cache.has(key)) continue;
    const ts = new Date(entry.created_at).getTime();
    if (Date.now() - ts > CACHE_TTL) continue;
    cache.set(key, {
      data: { status: "success", total_files: entry.files.length, list: entry.files } as TeraBoxResponse,
      timestamp: ts,
    });
  }
}

/** Check shared_cache table (cross-user) before calling API */
async function checkSharedCache(sourceUrl: string): Promise<TeraBoxResponse | null> {
  const key = sourceUrl.trim().toLowerCase();
  try {
    const { data } = await supabase
      .from("shared_cache" as any)
      .select("file_data, file_count")
      .eq("source_url", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!data) return null;
    const files = (data as any).file_data as TeraBoxFile[];
    return { status: "success", total_files: (data as any).file_count, list: files };
  } catch {
    return null; // silently fall through to API
  }
}

/** Save to shared_cache for other users */
async function saveToSharedCache(sourceUrl: string, files: TeraBoxFile[], userId?: string) {
  const key = sourceUrl.trim().toLowerCase();
  try {
    await supabase.from("shared_cache" as any).upsert(
      {
        source_url: key,
        file_data: files as any,
        file_count: files.length,
        fetched_by: userId ?? null,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "source_url" }
    );
  } catch {
    // non-critical — silently fail
  }
}

export function useTeraBox() {
  const [data, setData] = useState<TeraBoxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheSource, setCacheSource] = useState<"memory" | "database" | "redis" | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const inflightRef = useRef<Map<string, Promise<TeraBoxResponse>>>(new Map());

  const fetchFile = useCallback(async (url: string) => {
    const key = url.trim().toLowerCase();

    // 1. Check in-memory cache
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setError(null);
      setLoading(false);
      setFromCache(true);
      setCacheSource("memory");
      setCacheAge(Math.floor((Date.now() - cached.timestamp) / 1000));
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setFromCache(false);
    setCacheSource(null);
    setCacheAge(null);

    setLoading(true);
    setError(null);
    setData(null);
    setFromCache(false);

    // Dedupe in-flight requests
    const inflight = inflightRef.current.get(key);
    if (inflight) {
      try {
        const result = await inflight;
        setData(result);
        setFromCache(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
      return;
    }

    const promise = (async () => {
      // 2. Check shared cache (cross-user DB cache)
      const shared = await checkSharedCache(url);
      if (shared) {
        setFromCache(true);
        setCacheSource("database");
        // Estimate age - DB cache is max 8 hours
        setCacheAge(null);
        return shared;
      }

      // 3. Call the API (streaming service)
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "streaming-service",
        { body: { url } }
      );
      if (fnError) {
        const msg = fnError.message || "Failed to connect";
        if (msg.includes("INVALID_URL")) throw new Error("Invalid or expired TerraBox link. Please check the URL and try again.");
        if (msg.includes("non-2xx")) throw new Error("Our servers are currently at capacity. Please try again in a few minutes.");
        throw new Error(msg);
      }
      if (result?.error) {
        if (result.error === "SERVICE_BUSY") throw new Error(result.message || "Our servers are currently at capacity. Please try again in a few minutes.");
        if (result.error.includes("INVALID_URL") || result.error.includes("Invalid Link")) {
          throw new Error("Invalid or expired TerraBox link. Please check the URL and try again.");
        }
        throw new Error(result.message || result.error);
      }
      if (result.status !== "success") throw new Error("Failed to fetch file info");

      // Check if response was from Redis cache
      if (result.cached) {
        setFromCache(true);
        setCacheSource("redis");
        setCacheAge(result.cache_age_seconds || null);
      } else {
        setFromCache(false);
        setCacheSource(null);
        setCacheAge(null);
      }

      // Save to shared cache for other users
      const response = result as TeraBoxResponse;
      saveToSharedCache(url, response.list);

      return response;
    })();

    inflightRef.current.set(key, promise);

    try {
      const result = await promise;
      cache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      inflightRef.current.delete(key);
      setLoading(false);
    }
  }, []);

  const getCached = useCallback((url: string): TeraBoxResponse | null => {
    const key = url.trim().toLowerCase();
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    return null;
  }, []);

  return { data, loading, error, fetchFile, getCached, fromCache, cacheSource, cacheAge };
}
