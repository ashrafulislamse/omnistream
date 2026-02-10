/**
 * Download Service - Dedicated microservice for file downloads
 * 
 * Responsibilities:
 * - Provide download links with Redis caching
 * - Track download history
 * - Handle download link refresh
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import {
  getMetadataCache,
  setMetadataCache,
  isMetadataFresh,
  checkRateLimit,
  markSlotExhausted,
  isSlotExhausted,
} from "../_shared/redis.ts";

const RATE_LIMIT = 50; // Higher limit for downloads
const RATE_WINDOW = 3600;

interface ApiSlot {
  id: string;
  key: string;
  endpoint: string;
}

async function getAvailableSlots(): Promise<ApiSlot[]> {
  const slots = [
    { id: "standard_1", envName: "TERABOX_API_KEY", endpoint: "https://xapiverse.com/api/terabox" },
    { id: "standard_2", envName: "TERABOX_API_KEY_2", endpoint: "https://xapiverse.com/api/terabox" },
    { id: "standard_3", envName: "TERABOX_API_KEY_3", endpoint: "https://xapiverse.com/api/terabox" },
    { id: "pro_1", envName: "TERABOX_PRO_API_KEY", endpoint: "https://xapiverse.com/api/terabox-pro" },
    { id: "pro_2", envName: "TERABOX_PRO_API_KEY_2", endpoint: "https://xapiverse.com/api/terabox-pro" },
  ];

  const available: ApiSlot[] = [];
  for (const slot of slots) {
    const key = Deno.env.get(slot.envName);
    if (!key) continue;
    
    const exhausted = await isSlotExhausted(slot.id);
    if (exhausted) continue;
    
    available.push({ id: slot.id, key, endpoint: slot.endpoint });
  }
  return available;
}

function isQuotaError(status: number, data: unknown): boolean {
  if (status === 402 || status === 429) return true;
  const msg = JSON.stringify(data).toLowerCase();
  return msg.includes("insufficient") || msg.includes("quota") || msg.includes("balance") || msg.includes("credit");
}

async function fetchFromApi(url: string): Promise<{ files: unknown[]; success: boolean; error?: string }> {
  const slots = await getAvailableSlots();
  
  if (slots.length === 0) {
    return { files: [], success: false, error: "SERVICE_BUSY" };
  }

  for (const slot of slots) {
    try {
      const response = await fetch(slot.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xAPIverse-Key": slot.key,
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        return { files: data.list || [], success: true };
      }

      if (isQuotaError(response.status, data)) {
        console.warn(`Slot ${slot.id} exhausted, marking in Redis...`);
        await markSlotExhausted(slot.id);
        continue;
      }

      return { files: [], success: false, error: data.error || "API error" };
    } catch (err) {
      console.error(`Slot ${slot.id} network error:`, err);
      continue;
    }
  }

  return { files: [], success: false, error: "SERVICE_BUSY" };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse("Authentication required", 401);
    }

    const rateLimit = await checkRateLimit(auth.user.id, "download", RATE_LIMIT, RATE_WINDOW);
    if (!rateLimit.allowed) {
      return errorResponse(`Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 60)} minutes.`, 429);
    }

    const body = await req.json();
    const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";
    const fileId = body?.fs_id; // Optional: specific file to get download link for
    const forceRefresh = body?.force === true;

    if (!sourceUrl) {
      return errorResponse("A valid TerraBox URL is required", 400);
    }

    // Validate URL
    const validDomains = ["terabox.com", "1024terabox.com", "teraboxapp.com", "1024tera.com"];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return errorResponse("Invalid URL format", 400);
    }

    if (!validDomains.some((d) => parsedUrl.hostname.endsWith(d))) {
      return errorResponse("Only TerraBox URLs are supported", 400);
    }

    // Check Redis cache
    if (!forceRefresh) {
      const cached = await getMetadataCache(sourceUrl);
      if (cached && isMetadataFresh(cached)) {
        // If looking for specific file
        if (fileId) {
          const file = (cached.files as any[]).find(f => f.fs_id === fileId);
          if (file) {
            // Track download
            await trackDownload(auth.supabase, auth.user.id, file);
            return jsonResponse({
              status: "success",
              file,
              cached: true,
            });
          }
        }
        
        return jsonResponse({
          status: "success",
          total_files: cached.files.length,
          list: cached.files,
          cached: true,
        });
      }
    }

    // Fetch from API
    const result = await fetchFromApi(sourceUrl);
    
    if (!result.success) {
      if (result.error === "SERVICE_BUSY") {
        return jsonResponse({
          error: "SERVICE_BUSY",
          message: "Our servers are currently at capacity. Please try again in a few minutes.",
        }, 503);
      }
      return errorResponse(result.error || "Failed to fetch download links", 502);
    }

    // Cache the result
    await setMetadataCache(sourceUrl, result.files, auth.user.id);

    // If looking for specific file
    if (fileId) {
      const file = (result.files as any[]).find(f => f.fs_id === fileId);
      if (file) {
        await trackDownload(auth.supabase, auth.user.id, file);
        return jsonResponse({
          status: "success",
          file,
          cached: false,
        });
      }
    }

    return jsonResponse({
      status: "success",
      total_files: result.files.length,
      list: result.files,
      cached: false,
    });
  } catch (error) {
    console.error("Download service error:", error);
    return errorResponse("An unexpected error occurred", 500);
  }
});

async function trackDownload(supabase: any, userId: string, file: any) {
  try {
    await supabase.from("download_history").insert({
      user_id: userId,
      file_name: file.name,
      file_size: file.size?.toString(),
      file_type: file.type,
      download_link: file.dlink || file.fast_link || "",
      status: "initiated",
    });
  } catch (err) {
    console.warn("Failed to track download:", err);
  }
}
