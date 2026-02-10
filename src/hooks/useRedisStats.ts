import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/appwrite";

export interface RedisStats {
  connected: boolean;
  cacheStats: {
    metadata: { hits: number; misses: number; hitRate: number };
    session: { hits: number; misses: number; hitRate: number };
    thumbnail: { hits: number; misses: number; hitRate: number };
  };
  rateLimits: {
    streaming: { current: number; limit: number; resetIn: number };
    download: { current: number; limit: number; resetIn: number };
  };
  apiSlots: {
    id: string;
    exhausted: boolean;
    cooldownRemaining?: number;
  }[];
  memoryUsage?: string;
  lastUpdated: number;
}

async function fetchRedisStats(): Promise<RedisStats> {
  try {
    const { data, error } = await supabase.functions.invoke("platform-api", {
      body: { route: "auth", action: "redis-stats" },
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch Redis stats");
    }

    if (!data) {
      throw new Error("No data returned from Redis stats endpoint");
    }

    return data as RedisStats;
  } catch (err) {
    // Return a fallback with error state
    throw err;
  }
}

export function useRedisStats() {
  return useQuery({
    queryKey: ["redis", "stats"],
    queryFn: fetchRedisStats,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
    retry: 2,
  });
}

async function fetchServiceHealth(): Promise<{
  auth: boolean;
  redis: boolean;
  streaming: boolean;
  download: boolean;
  storage: boolean;
}> {
  const { data, error } = await supabase.functions.invoke("platform-api", {
    body: { route: "auth", action: "health" },
  });

  if (error) {
    return { auth: false, redis: false, streaming: false, download: false, storage: false };
  }

  return {
    auth: true,
    redis: data?.services?.redis ?? false,
    streaming: true,
    download: true,
    storage: true,
  };
}

export function useServiceHealth() {
  return useQuery({
    queryKey: ["services", "health"],
    queryFn: fetchServiceHealth,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
