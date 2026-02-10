import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to access microservices architecture features
 * Provides unified access to streaming, download, auth, and storage services
 */

export interface RateLimits {
  streaming: { remaining: number; resetIn: number };
  download: { remaining: number; resetIn: number };
}

export interface ServiceHealth {
  auth: boolean;
  redis: boolean;
}

export function useMicroservices() {
  const { toast } = useToast();
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [loading, setLoading] = useState(false);

  /** Validate session and get rate limit status */
  const validateSession = useCallback(async (): Promise<{
    valid: boolean;
    limits?: RateLimits;
  } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("platform-api", {
        body: { route: "auth", action: "validate" },
      });

      if (error || !data?.valid) {
        return { valid: false };
      }

      const limits = data.limits as RateLimits;
      setRateLimits(limits);
      return { valid: true, limits };
    } catch (err) {
      console.error("Session validation error:", err);
      return null;
    }
  }, []);

  /** Fetch streaming links (uses Redis cache) */
  const fetchStreamingLinks = useCallback(async (
    sourceUrl: string,
    options?: { force?: boolean }
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloud-service", {
        body: { route: "stream", url: sourceUrl, force: options?.force ?? false },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch streaming links");
      }

      if (data?.error === "SERVICE_BUSY") {
        throw new Error(data.message || "Service temporarily unavailable");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        files: data.list || [],
        cached: data.cached ?? false,
        cacheAge: data.cache_age_seconds,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Streaming service error";
      toast({ title: "Error", description: msg, variant: "destructive" });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /** Fetch download links (uses Redis cache) */
  const fetchDownloadLinks = useCallback(async (
    sourceUrl: string,
    options?: { fsId?: number; force?: boolean }
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloud-service", {
        body: {
          route: "download",
          url: sourceUrl,
          fs_id: options?.fsId,
          force: options?.force ?? false,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch download links");
      }

      if (data?.error === "SERVICE_BUSY") {
        throw new Error(data.message || "Service temporarily unavailable");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        files: data.list || [],
        file: data.file,
        cached: data.cached ?? false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download service error";
      toast({ title: "Error", description: msg, variant: "destructive" });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /** Check service health */
  const checkHealth = useCallback(async (): Promise<ServiceHealth | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("platform-api", {
        body: { route: "auth", action: "health" },
      });

      if (error) return null;
      return data?.services as ServiceHealth;
    } catch {
      return null;
    }
  }, []);

  /** Get storage statistics */
  const getStorageStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("platform-api", {
        body: { route: "storage", action: "stats" },
      });

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  return {
    // State
    rateLimits,
    loading,

    // Auth
    validateSession,

    // Streaming
    fetchStreamingLinks,

    // Downloads
    fetchDownloadLinks,

    // Health & Stats
    checkHealth,
    getStorageStats,
  };
}
