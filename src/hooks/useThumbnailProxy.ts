import { useCallback, useRef } from "react";
import { supabase } from "@/lib/appwrite";

/**
 * Resolves thumbnail URLs to permanent storage copies.
 * Calls the proxy-thumbnail edge function in batches and caches results in memory.
 */

// Global in-memory cache: original URL → permanent URL
const thumbCache = new Map<string, string>();
// In-flight dedup per batch key
let pendingBatch: { urls: Set<string>; promise: Promise<void> | null; timer: ReturnType<typeof setTimeout> | null } = {
  urls: new Set(),
  promise: null,
  timer: null,
};

async function flushBatch(onComplete: () => void) {
  const urls = Array.from(pendingBatch.urls);
  pendingBatch.urls.clear();
  pendingBatch.timer = null;

  if (urls.length === 0) {
    onComplete();
    return;
  }

  try {
    // Use unified platform-api for storage proxy
    const { data, error } = await supabase.functions.invoke("platform-api", {
      body: { route: "storage", action: "proxy", urls },
    });

    if (!error && data?.results) {
      for (const [original, stored] of Object.entries(data.results as Record<string, string>)) {
        thumbCache.set(original, stored);
      }
    }
  } catch {
    // Silently fail — thumbnails will just use originals
  }

  onComplete();
}

export function useThumbnailProxy() {
  const rerender = useRef<() => void>();

  /** Get the permanent URL for a thumbnail (returns original if not yet proxied). */
  const getThumbnail = useCallback((originalUrl: string | undefined): string | undefined => {
    if (!originalUrl) return undefined;
    return thumbCache.get(originalUrl) || originalUrl;
  }, []);

  /** Queue thumbnail URLs for background proxying. Call once per file list load. */
  const proxyThumbnails = useCallback((urls: (string | undefined)[], onDone?: () => void) => {
    const newUrls = urls.filter((u): u is string => !!u && !thumbCache.has(u));
    if (newUrls.length === 0) {
      onDone?.();
      return;
    }

    for (const u of newUrls) pendingBatch.urls.add(u);

    // Debounce: wait 100ms to collect all URLs, then flush
    if (pendingBatch.timer) clearTimeout(pendingBatch.timer);
    pendingBatch.timer = setTimeout(() => {
      flushBatch(() => onDone?.());
    }, 100);
  }, []);

  /** Check if a thumbnail has been proxied to permanent storage. */
  const isProxied = useCallback((originalUrl: string | undefined): boolean => {
    if (!originalUrl) return false;
    return thumbCache.has(originalUrl);
  }, []);

  return { getThumbnail, proxyThumbnails, isProxied };
}
