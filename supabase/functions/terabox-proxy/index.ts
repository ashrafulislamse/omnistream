import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter (per instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 60 * 1000;

// Track which keys are exhausted (per instance)
const exhaustedKeys = new Map<string, number>();
const KEY_COOLDOWN = 30 * 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

interface ApiSlot {
  id: string;
  key: string;
  endpoint: string;
}

function getAvailableSlots(): ApiSlot[] {
  const now = Date.now();
  const slots: { id: string; envName: string; endpoint: string }[] = [
    { id: "standard_1", envName: "TERABOX_API_KEY", endpoint: "https://xapiverse.com/api/terabox" },
    { id: "standard_2", envName: "TERABOX_API_KEY_2", endpoint: "https://xapiverse.com/api/terabox" },
    { id: "standard_3", envName: "TERABOX_API_KEY_3", endpoint: "https://xapiverse.com/api/terabox" },
    { id: "pro_1", envName: "TERABOX_PRO_API_KEY", endpoint: "https://xapiverse.com/api/terabox-pro" },
    { id: "pro_2", envName: "TERABOX_PRO_API_KEY_2", endpoint: "https://xapiverse.com/api/terabox-pro" },
  ];

  const available: ApiSlot[] = [];
  for (const slot of slots) {
    const val = Deno.env.get(slot.envName);
    if (!val) continue;
    const exhaustedUntil = exhaustedKeys.get(slot.id);
    if (exhaustedUntil && now < exhaustedUntil) continue;
    available.push({ id: slot.id, key: val, endpoint: slot.endpoint });
  }
  return available;
}

function isQuotaError(status: number, data: any): boolean {
  if (status === 402 || status === 429) return true;
  const msg = JSON.stringify(data).toLowerCase();
  return msg.includes("insufficient") || msg.includes("quota") || msg.includes("balance") || msg.includes("credit");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // --- Rate limiting by user ---
    const clientId = `user:${userId}`;
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return new Response(
        JSON.stringify({ error: "A valid TerraBox URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validDomains = ["terabox.com", "1024terabox.com", "teraboxapp.com", "1024tera.com"];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validDomains.some((d) => parsedUrl.hostname.endsWith(d))) {
      return new Response(
        JSON.stringify({ error: "Only TerraBox URLs are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slots = getAvailableSlots();
    if (slots.length === 0) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const slot of slots) {
      const response = await fetch(slot.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xAPIverse-Key": slot.key,
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (isQuotaError(response.status, data)) {
        console.warn(`Slot ${slot.id} exhausted (${response.status}), trying next...`);
        exhaustedKeys.set(slot.id, Date.now() + KEY_COOLDOWN);
        continue;
      }

      // Non-quota error — generic message to client
      console.error(`TeraBox API error [${response.status}]:`, JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to process the link. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "SERVICE_BUSY", message: "Our servers are currently at capacity. Please try again in a few minutes." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("TeraBox proxy error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
