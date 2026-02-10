/**
 * Extension API - Endpoint for browser extensions and external clients
 * Supports: add-to-queue, get-queue, auth-check
 */

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, getServiceClient } from "../_shared/auth.ts";

interface AddLinkRequest {
  url: string;
  title?: string;
}

interface QueueItem {
  id: string;
  url: string;
  title?: string;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // Health check endpoint (no auth required)
    if (path === "health" && req.method === "GET") {
      return jsonResponse({ status: "ok", version: "1.0.0" });
    }

    // Auth check endpoint
    if (path === "auth-check" && req.method === "GET") {
      const auth = await authenticateRequest(req);
      if (!auth) {
        return jsonResponse({ authenticated: false }, 401);
      }
      return jsonResponse({
        authenticated: true,
        user: { id: auth.user.id, email: auth.user.email },
      });
    }

    // All other endpoints require authentication
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse("Unauthorized", 401);
    }

    // Add link to favorites/queue
    if (path === "add-link" && req.method === "POST") {
      const body: AddLinkRequest = await req.json();
      
      if (!body.url) {
        return errorResponse("URL is required", 400);
      }

      // Validate TeraBox URL
      const validDomains = ["terabox.com", "1024terabox.com", "teraboxapp.com", "1024tera.com"];
      const isValid = validDomains.some(domain => body.url.includes(domain));
      if (!isValid) {
        return errorResponse("Invalid TeraBox URL", 400);
      }

      // Check rate limit (10 adds per minute)
      const { data: allowed } = await auth.supabase.rpc("check_rate_limit", {
        _user_id: auth.user.id,
        _action_type: "extension_add",
        _max_count: 10,
        _window_minutes: 1,
      });

      if (!allowed) {
        return errorResponse("Rate limit exceeded. Try again in a minute.", 429);
      }

      // Record rate limit
      await auth.supabase.from("rate_limits").insert({
        user_id: auth.user.id,
        action_type: "extension_add",
      });

      // Store the link in fetched_files for processing
      // The web app will pick it up and process it
      const { error: insertError } = await auth.supabase.from("fetched_files").insert({
        user_id: auth.user.id,
        source_url: body.url,
        file_data: { pending: true, title: body.title || null },
        file_count: 0,
      });

      if (insertError) {
        console.error("[Extension API] Insert error:", insertError);
        return errorResponse("Failed to add link", 500);
      }

      return jsonResponse({
        success: true,
        message: "Link added to queue",
        url: body.url,
      });
    }

    // Get user's recent links
    if (path === "queue" && req.method === "GET") {
      const { data: links, error } = await auth.supabase
        .from("fetched_files")
        .select("id, source_url, file_count, created_at, file_data")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[Extension API] Queue fetch error:", error);
        return errorResponse("Failed to fetch queue", 500);
      }

      const queue: QueueItem[] = (links || []).map((link) => ({
        id: link.id,
        url: link.source_url,
        title: (link.file_data as Record<string, unknown>)?.title as string | undefined,
        status: link.file_count === 0 ? "pending" : "done",
        created_at: link.created_at,
      }));

      return jsonResponse({ queue });
    }

    // Get user stats for extension badge
    if (path === "stats" && req.method === "GET") {
      const [favResult, historyResult] = await Promise.all([
        auth.supabase
          .from("favorites")
          .select("*", { count: "exact", head: true })
          .eq("user_id", auth.user.id),
        auth.supabase
          .from("download_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", auth.user.id),
      ]);

      return jsonResponse({
        favorites: favResult.count || 0,
        downloads: historyResult.count || 0,
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    console.error("[Extension API] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
