/**
 * Auth Helper Service - Dedicated microservice for authentication utilities
 * Version: 2.0.0
 * 
 * Responsibilities:
 * - Session validation and caching
 * - User profile operations
 * - Rate limit status checks
 * - Redis monitoring stats (admin only)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateRequest, getServiceClient } from "../_shared/auth.ts";
import {
  getSessionCache,
  invalidateSessionCache,
  checkRateLimit,
  isRedisHealthy,
  isSlotExhausted,
  cacheTtl,
  CACHE_PREFIX,
} from "../_shared/redis.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "validate";

  try {
    switch (action) {
      case "validate": {
        // Validate user session
        const auth = await authenticateRequest(req);
        if (!auth) {
          return errorResponse("Invalid or expired session", 401);
        }

        // Check various rate limits for the user
        const [streamingLimit, downloadLimit] = await Promise.all([
          checkRateLimit(auth.user.id, "streaming", 30, 3600),
          checkRateLimit(auth.user.id, "download", 50, 3600),
        ]);

        return jsonResponse({
          valid: true,
          user: {
            id: auth.user.id,
            email: auth.user.email,
          },
          limits: {
            streaming: {
              remaining: streamingLimit.remaining,
              resetIn: streamingLimit.resetIn,
            },
            download: {
              remaining: downloadLimit.remaining,
              resetIn: downloadLimit.resetIn,
            },
          },
        });
      }

      case "logout": {
        // Invalidate session cache
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.replace("Bearer ", "");
          await invalidateSessionCache(token);
        }
        return jsonResponse({ success: true, message: "Session invalidated" });
      }

      case "profile": {
        // Get user profile
        const auth = await authenticateRequest(req);
        if (!auth) {
          return errorResponse("Authentication required", 401);
        }

        const { data: profile, error } = await auth.supabase
          .from("profiles")
          .select("*")
          .eq("id", auth.user.id)
          .maybeSingle();

        if (error) {
          return errorResponse("Failed to fetch profile", 500);
        }

        return jsonResponse({ profile });
      }

      case "update-profile": {
        const auth = await authenticateRequest(req);
        if (!auth) {
          return errorResponse("Authentication required", 401);
        }

        const body = await req.json();
        const updates: Record<string, unknown> = {};
        
        if (body.display_name) updates.display_name = body.display_name;
        if (body.avatar_url) updates.avatar_url = body.avatar_url;

        const { data, error } = await auth.supabase
          .from("profiles")
          .update(updates)
          .eq("id", auth.user.id)
          .select()
          .maybeSingle();

        if (error) {
          return errorResponse("Failed to update profile", 500);
        }

        return jsonResponse({ profile: data });
      }

      case "health": {
        // Health check including Redis status
        const redisOk = await isRedisHealthy();
        return jsonResponse({
          status: "ok",
          services: {
            auth: true,
            redis: redisOk,
          },
        });
      }

      case "redis-stats": {
        // Redis monitoring stats for admin dashboard
        const auth = await authenticateRequest(req);
        if (!auth) {
          return errorResponse("Authentication required", 401);
        }

        // Check if user is admin
        const supabase = getServiceClient();
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: auth.user.id,
          _role: "admin",
        });

        if (!isAdmin) {
          return errorResponse("Admin access required", 403);
        }

        const redisOk = await isRedisHealthy();

        // Get API slot status
        const slotIds = ["standard_1", "standard_2", "standard_3", "pro_1", "pro_2"];
        const apiSlots = await Promise.all(
          slotIds.map(async (id) => {
            const exhausted = await isSlotExhausted(id);
            const cooldown = exhausted ? await cacheTtl(`${CACHE_PREFIX.API_SLOT}${id}`) : 0;
            return {
              id,
              exhausted,
              cooldownRemaining: exhausted ? cooldown : undefined,
            };
          })
        );

        // Get rate limit stats for the requesting user (as example)
        const [streamingLimit, downloadLimit] = await Promise.all([
          checkRateLimit(auth.user.id, "streaming", 30, 3600),
          checkRateLimit(auth.user.id, "download", 50, 3600),
        ]);

        return jsonResponse({
          connected: redisOk,
          cacheStats: {
            metadata: { hits: 0, misses: 0, hitRate: 0 }, // Would need Redis INFO command
            session: { hits: 0, misses: 0, hitRate: 0 },
            thumbnail: { hits: 0, misses: 0, hitRate: 0 },
          },
          rateLimits: {
            streaming: {
              current: 30 - streamingLimit.remaining,
              limit: 30,
              resetIn: streamingLimit.resetIn,
            },
            download: {
              current: 50 - downloadLimit.remaining,
              limit: 50,
              resetIn: downloadLimit.resetIn,
            },
          },
          apiSlots,
          lastUpdated: Date.now(),
        });
      }

      case "role": {
        // Check user role
        const auth = await authenticateRequest(req);
        if (!auth) {
          return errorResponse("Authentication required", 401);
        }

        const supabase = getServiceClient();
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: auth.user.id,
          _role: "admin",
        });

        return jsonResponse({
          isAdmin: data === true,
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error("Auth helper error:", error);
    return errorResponse("An unexpected error occurred", 500);
  }
});
