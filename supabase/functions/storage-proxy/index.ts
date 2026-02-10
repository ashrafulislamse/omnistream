/**
 * Storage Proxy Service - Dedicated microservice for file storage operations
 * 
 * Responsibilities:
 * - Thumbnail proxying and persistent storage
 * - Redis caching for thumbnail URL mappings
 * - Batch thumbnail processing
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";
import { getThumbnailCache, setThumbnailCache } from "../_shared/redis.ts";

const BUCKET = "thumbnails";

/** Create a deterministic filename from a URL */
async function urlToKey(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = new TextDecoder().decode(hexEncode(new Uint8Array(hash)));
  return hex.slice(0, 32);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "proxy";

  try {
    const supabase = getServiceClient();

    switch (action) {
      case "proxy": {
        // Proxy and cache thumbnails
        const body = await req.json();

        const urls: string[] = Array.isArray(body.urls)
          ? body.urls.filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
          : typeof body.url === "string" && body.url.startsWith("http")
            ? [body.url]
            : [];

        if (urls.length === 0) {
          return errorResponse("No valid URLs provided", 400);
        }

        const batch = urls.slice(0, 20);
        const results: Record<string, string> = {};

        await Promise.all(
          batch.map(async (originalUrl) => {
            try {
              // Check Redis cache first
              const cachedUrl = await getThumbnailCache(originalUrl);
              if (cachedUrl) {
                results[originalUrl] = cachedUrl;
                return;
              }

              const key = await urlToKey(originalUrl);
              const filePath = `${key}.jpg`;

              // Check if file exists in storage
              const { data: files } = await supabase.storage.from(BUCKET).list("", {
                search: key,
                limit: 1,
              });

              const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

              if (files && files.length > 0 && files.some((f) => f.name === `${key}.jpg`)) {
                // File exists, cache and return
                await setThumbnailCache(originalUrl, publicUrlData.publicUrl);
                results[originalUrl] = publicUrlData.publicUrl;
                return;
              }

              // Download from origin
              const resp = await fetch(originalUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (compatible; OmniStream/1.0)",
                  Referer: "https://www.terabox.com/",
                },
              });

              if (!resp.ok) {
                console.warn(`Failed to download thumbnail: ${resp.status} ${originalUrl}`);
                return;
              }

              const contentType = resp.headers.get("content-type") || "image/jpeg";
              const buffer = await resp.arrayBuffer();

              // Upload to storage
              const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(filePath, buffer, {
                  contentType,
                  upsert: true,
                });

              if (uploadError) {
                console.error("Upload error:", uploadError.message);
                return;
              }

              // Cache the mapping in Redis
              await setThumbnailCache(originalUrl, publicUrlData.publicUrl);
              results[originalUrl] = publicUrlData.publicUrl;
            } catch (e) {
              console.warn(`Thumbnail proxy failed for ${originalUrl}:`, e);
            }
          })
        );

        return jsonResponse({ results });
      }

      case "check": {
        // Check if thumbnails exist (without downloading)
        const body = await req.json();
        const urls: string[] = Array.isArray(body.urls) ? body.urls : body.url ? [body.url] : [];

        const results: Record<string, { exists: boolean; url?: string }> = {};

        await Promise.all(
          urls.slice(0, 50).map(async (originalUrl) => {
            try {
              // Check Redis cache first
              const cachedUrl = await getThumbnailCache(originalUrl);
              if (cachedUrl) {
                results[originalUrl] = { exists: true, url: cachedUrl };
                return;
              }

              const key = await urlToKey(originalUrl);
              const { data: files } = await supabase.storage.from(BUCKET).list("", {
                search: key,
                limit: 1,
              });

              if (files && files.some((f) => f.name === `${key}.jpg`)) {
                const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(`${key}.jpg`);
                await setThumbnailCache(originalUrl, publicUrlData.publicUrl);
                results[originalUrl] = { exists: true, url: publicUrlData.publicUrl };
              } else {
                results[originalUrl] = { exists: false };
              }
            } catch {
              results[originalUrl] = { exists: false };
            }
          })
        );

        return jsonResponse({ results });
      }

      case "delete": {
        // Delete a stored thumbnail
        const body = await req.json();
        const originalUrl = body.url;

        if (!originalUrl) {
          return errorResponse("URL required", 400);
        }

        const key = await urlToKey(originalUrl);
        const { error } = await supabase.storage.from(BUCKET).remove([`${key}.jpg`]);

        if (error) {
          return errorResponse("Failed to delete thumbnail", 500);
        }

        return jsonResponse({ success: true });
      }

      case "stats": {
        // Get storage statistics
        const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });

        if (error) {
          return errorResponse("Failed to get stats", 500);
        }

        const totalFiles = data?.length || 0;
        const totalSize = data?.reduce((acc, f) => acc + (f.metadata?.size || 0), 0) || 0;

        return jsonResponse({
          bucket: BUCKET,
          totalFiles,
          totalSizeBytes: totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error("Storage proxy error:", error);
    return errorResponse("Failed to process request", 500);
  }
});
