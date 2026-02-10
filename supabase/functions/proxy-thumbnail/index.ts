import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "thumbnails";

/** Create a short deterministic filename from a URL */
async function urlToKey(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = new TextDecoder().decode(hexEncode(new Uint8Array(hash)));
  return hex.slice(0, 32); // 32-char hex = 128-bit, plenty unique
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // Support both single URL and batch
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls.filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
      : typeof body.url === "string" && body.url.startsWith("http")
        ? [body.url]
        : [];

    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: "No valid URLs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap batch size
    const batch = urls.slice(0, 20);
    const results: Record<string, string> = {};

    await Promise.all(
      batch.map(async (originalUrl) => {
        try {
          const key = await urlToKey(originalUrl);
          const filePath = `${key}.jpg`;

          // Check if already stored
          const { data: existing } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60);
          // If file exists, just return the public URL
          const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

          // Try to verify file exists by listing
          const { data: files } = await supabase.storage.from(BUCKET).list("", {
            search: key,
            limit: 1,
          });

          if (files && files.length > 0 && files.some((f) => f.name === `${key}.jpg`)) {
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

          results[originalUrl] = publicUrlData.publicUrl;
        } catch (e) {
          console.warn(`Thumbnail proxy failed for ${originalUrl}:`, e);
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Proxy thumbnail error:", error);
    return new Response(JSON.stringify({ error: "Failed to process thumbnails" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
