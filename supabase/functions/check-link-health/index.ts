import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all favorites that have source_urls
    const { data: favorites, error: favError } = await supabase
      .from("favorites")
      .select("id, user_id, source_url, download_link, fast_download_link, stream_url, file_name")
      .not("source_url", "is", null);

    if (favError) throw favError;
    if (!favorites?.length) {
      return new Response(JSON.stringify({ checked: 0, message: "No favorites to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let checkedCount = 0;
    let brokenCount = 0;

    for (const fav of favorites) {
      // Test the best available link
      const testUrl = fav.fast_download_link || fav.download_link || fav.stream_url;
      let status = "healthy";
      let lastError: string | null = null;

      if (!testUrl) {
        status = "unknown";
        lastError = "No link available to test";
      } else {
        try {
          const resp = await fetch(testUrl, {
            method: "HEAD",
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
          });
          if (resp.status === 403 || resp.status === 404 || resp.status === 410) {
            status = "expired";
            lastError = `HTTP ${resp.status}`;
          } else if (!resp.ok && resp.status !== 0) {
            status = "broken";
            lastError = `HTTP ${resp.status}`;
          }
        } catch (err) {
          // Network errors might be CORS-related (opaque), treat as unknown
          status = "unknown";
          lastError = err instanceof Error ? err.message : "Network error";
        }
      }

      if (status !== "healthy") brokenCount++;

      // Upsert link_health record
      const { data: existing } = await supabase
        .from("link_health")
        .select("id, fail_count")
        .eq("favorite_id", fav.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("link_health").update({
          status,
          last_checked_at: new Date().toISOString(),
          fail_count: status === "healthy" ? 0 : existing.fail_count + 1,
          last_error: lastError,
        }).eq("id", existing.id);
      } else {
        await supabase.from("link_health").insert({
          favorite_id: fav.id,
          user_id: fav.user_id,
          source_url: fav.source_url,
          status,
          fail_count: status === "healthy" ? 0 : 1,
          last_error: lastError,
        });
      }

      checkedCount++;
    }

    // Also clean expired shared cache
    await supabase.rpc("cleanup_expired_cache");

    return new Response(
      JSON.stringify({ checked: checkedCount, broken: brokenCount, message: "Health check complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Link health check error:", error);
    return new Response(
      JSON.stringify({ error: "Health check failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
