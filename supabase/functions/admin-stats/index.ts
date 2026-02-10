import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UUID validation helper
    const isValidUUID = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    // Handle POST for role management & ban/unban
    if (req.method === "POST") {
      const body = await req.json();
      const { action, targetUserId, role } = body;

      // Validate action is a known string
      if (typeof action !== "string" || !["assign", "remove", "ban", "unban"].includes(action)) {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate targetUserId is a valid UUID
      if (!targetUserId || typeof targetUserId !== "string" || !isValidUUID(targetUserId)) {
        return new Response(JSON.stringify({ error: "Invalid or missing target user ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ban / Unban user
      if (action === "ban" || action === "unban") {
        if (targetUserId === user.id) {
          return new Response(JSON.stringify({ error: "Cannot ban yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (action === "ban") {
          const { error } = await admin.auth.admin.updateUserById(targetUserId, {
            ban_duration: "876000h", // ~100 years
          });
          if (error) throw error;
        } else {
          const { error } = await admin.auth.admin.updateUserById(targetUserId, {
            ban_duration: "none",
          });
          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Role management — validate role
      if (typeof role !== "string" || !["admin", "moderator", "user"].includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetUserId === user.id && action === "remove" && role === "admin") {
        return new Response(JSON.stringify({ error: "Cannot remove your own admin role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "assign") {
        const { error } = await admin
          .from("user_roles")
          .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });
        if (error) throw error;
      } else if (action === "remove") {
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .eq("role", role);
        if (error) throw error;
      } else {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get("section") || "overview";

    if (section === "overview") {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [users, downloads, favorites, fetchedFiles, sharedLinks, sharedCache, rateLimits,
             dl24h, fetch24h, dl7d, fetch7d, users7d, fav24h, shares24h] =
        await Promise.all([
          admin.from("profiles").select("id", { count: "exact", head: true }),
          admin.from("download_history").select("id", { count: "exact", head: true }),
          admin.from("favorites").select("id", { count: "exact", head: true }),
          admin.from("fetched_files").select("id", { count: "exact", head: true }),
          admin.from("shared_links").select("id", { count: "exact", head: true }),
          admin.from("shared_cache").select("id", { count: "exact", head: true }),
          admin.from("rate_limits").select("id", { count: "exact", head: true }),
          admin.from("download_history").select("id", { count: "exact", head: true }).gte("created_at", since24h),
          admin.from("fetched_files").select("id", { count: "exact", head: true }).gte("created_at", since24h),
          admin.from("download_history").select("id", { count: "exact", head: true }).gte("created_at", since7d),
          admin.from("fetched_files").select("id", { count: "exact", head: true }).gte("created_at", since7d),
          admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
          admin.from("favorites").select("id", { count: "exact", head: true }).gte("created_at", since24h),
          admin.from("shared_links").select("id", { count: "exact", head: true }).gte("created_at", since24h),
        ]);

      // Get total shared link views
      const { data: viewData } = await admin
        .from("shared_links")
        .select("view_count");
      const totalViews = viewData?.reduce((sum: number, s: any) => sum + (s.view_count || 0), 0) || 0;

      return new Response(
        JSON.stringify({
          totalUsers: users.count || 0,
          totalDownloads: downloads.count || 0,
          totalFavorites: favorites.count || 0,
          totalFetchedFiles: fetchedFiles.count || 0,
          totalSharedLinks: sharedLinks.count || 0,
          totalCachedEntries: sharedCache.count || 0,
          totalRateLimitHits: rateLimits.count || 0,
          totalSharedViews: totalViews,
          last24h: {
            downloads: dl24h.count || 0,
            fetches: fetch24h.count || 0,
            favorites: fav24h.count || 0,
            shares: shares24h.count || 0,
          },
          last7d: {
            downloads: dl7d.count || 0,
            fetches: fetch7d.count || 0,
            newUsers: users7d.count || 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "users") {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const [downloadCounts, favCounts, fetchCounts] = await Promise.all([
        admin.from("download_history").select("user_id"),
        admin.from("favorites").select("user_id"),
        admin.from("fetched_files").select("user_id"),
      ]);

      const countByUser = (items: any[] | null) => {
        const map: Record<string, number> = {};
        items?.forEach((d: any) => { map[d.user_id] = (map[d.user_id] || 0) + 1; });
        return map;
      };

      const userDownloads = countByUser(downloadCounts.data);
      const userFavs = countByUser(favCounts.data);
      const userFetches = countByUser(fetchCounts.data);

      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const userRoles: Record<string, string[]> = {};
      roles?.forEach((r: any) => {
        if (!userRoles[r.user_id]) userRoles[r.user_id] = [];
        userRoles[r.user_id].push(r.role);
      });

      // Fetch ban status from auth.users via admin API
      const { data: authUsersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const bannedMap: Record<string, boolean> = {};
      authUsersData?.users?.forEach((au: any) => {
        // banned_until is set when user is banned
        if (au.banned_until && new Date(au.banned_until) > new Date()) {
          bannedMap[au.id] = true;
        }
      });

      const enriched = profiles?.map((p: any) => ({
        ...p,
        downloads: userDownloads[p.id] || 0,
        favorites: userFavs[p.id] || 0,
        fetches: userFetches[p.id] || 0,
        roles: userRoles[p.id] || [],
        banned: bannedMap[p.id] || false,
      }));

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "recent-activity") {
      const { data: recentDownloads } = await admin
        .from("download_history")
        .select("id, file_name, file_type, file_size, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: recentFetches } = await admin
        .from("fetched_files")
        .select("id, source_url, file_count, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50);

      // Get user names for activity
      const userIds = new Set<string>();
      recentDownloads?.forEach((d: any) => userIds.add(d.user_id));
      recentFetches?.forEach((f: any) => userIds.add(f.user_id));

      const { data: names } = await admin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", [...userIds]);

      const nameMap: Record<string, { name: string; avatar: string | null }> = {};
      names?.forEach((n: any) => { nameMap[n.id] = { name: n.display_name || "Unknown", avatar: n.avatar_url }; });

      return new Response(
        JSON.stringify({
          recentDownloads: recentDownloads?.map((d: any) => ({ ...d, user: nameMap[d.user_id] })),
          recentFetches: recentFetches?.map((f: any) => ({ ...f, user: nameMap[f.user_id] })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "errors") {
      const { data: logs } = await admin
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(JSON.stringify(logs || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "api-monitor") {
      const allSlots = [
        { name: "TERABOX_API_KEY", label: "Standard Key 1", type: "standard", endpoint: "https://xapiverse.com/api/terabox" },
        { name: "TERABOX_API_KEY_2", label: "Standard Key 2", type: "standard", endpoint: "https://xapiverse.com/api/terabox" },
        { name: "TERABOX_API_KEY_3", label: "Standard Key 3", type: "standard", endpoint: "https://xapiverse.com/api/terabox" },
        { name: "TERABOX_PRO_API_KEY", label: "Pro Key 1", type: "pro", endpoint: "https://xapiverse.com/api/terabox-pro" },
        { name: "TERABOX_PRO_API_KEY_2", label: "Pro Key 2", type: "pro", endpoint: "https://xapiverse.com/api/terabox-pro" },
      ];

      const keyChecks = await Promise.all(
        allSlots.map(async (slot) => {
          const val = Deno.env.get(slot.name);
          if (!val) {
            return { ...slot, configured: false, status: "not_configured", credits: null, latency: null };
          }

          const start = Date.now();
          try {
            const resp = await fetch(slot.endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", "xAPIverse-Key": val },
              body: JSON.stringify({ url: "https://terabox.com/s/test-health-check" }),
            });
            const latency = Date.now() - start;
            const body = await resp.json().catch(() => ({}));

            let status = "unknown";
            let credits = null;

            if (resp.status === 402 || resp.status === 429) {
              status = "quota_exceeded";
            } else if (resp.ok || resp.status === 400) {
              status = "active";
            } else {
              status = "error";
            }

            if (body.free_credits_remaining) {
              credits = body.free_credits_remaining;
            }

            return { ...slot, configured: true, status, credits, latency };
          } catch {
            return { ...slot, configured: true, status: "unreachable", credits: null, latency: null };
          }
        })
      );

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [apiCalls24h, apiCalls1h] = await Promise.all([
        admin.from("rate_limits").select("id", { count: "exact", head: true }).eq("action_type", "fetch").gte("created_at", since24h),
        admin.from("rate_limits").select("id", { count: "exact", head: true }).eq("action_type", "fetch").gte("created_at", since1h),
      ]);

      const configuredKeys = keyChecks.filter((k) => k.configured);
      const activeKeys = keyChecks.filter((k) => k.status === "active");

      return new Response(
        JSON.stringify({
          keys: keyChecks,
          configuredCount: configuredKeys.length,
          activeCount: activeKeys.length,
          totalSlots: allSlots.length,
          usage: { last1h: apiCalls1h.count || 0, last24h: apiCalls24h.count || 0 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "storage") {
      const { data: objects } = await admin.storage.from("thumbnails").list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

      const totalSize = objects?.reduce((sum: number, o: any) => sum + (o.metadata?.size || 0), 0) || 0;

      return new Response(
        JSON.stringify({
          thumbnailCount: objects?.length || 0,
          totalSizeBytes: totalSize,
          recentFiles: objects?.slice(0, 20),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown section" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Admin stats error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
