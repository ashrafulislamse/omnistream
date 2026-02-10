/**
 * Shared authentication utilities for microservices
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getSessionCache, setSessionCache, CachedSession } from "./redis.ts";

export interface AuthResult {
  user: { id: string; email?: string };
  supabase: SupabaseClient;
}

/**
 * Authenticate a request using the Authorization header.
 * Uses Redis cache to avoid hitting Supabase auth on every request.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Check Redis session cache first
  const cachedSession = await getSessionCache(token);
  if (cachedSession) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    return {
      user: { id: cachedSession.userId, email: cachedSession.email },
      supabase,
    };
  }

  // Validate with Supabase using getUser
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    return null;
  }

  const userId = userData.user.id;
  const email = userData.user.email;

  // Cache the session for faster subsequent requests
  await setSessionCache(token, {
    userId,
    email,
    role: userData.user.role,
    cachedAt: Date.now(),
  });

  return {
    user: { id: userId, email },
    supabase,
  };
}

/**
 * Get a service-role Supabase client for admin operations
 */
export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
