import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/appwrite";
import { useAuth } from "@/contexts/AuthContext";

export interface LinkHealthEntry {
  id: string;
  favorite_id: string;
  source_url: string;
  status: "healthy" | "broken" | "expired" | "unknown";
  last_checked_at: string;
  fail_count: number;
  last_error: string | null;
}

export function useLinkHealth() {
  const { user } = useAuth();
  const [healthMap, setHealthMap] = useState<Map<string, LinkHealthEntry>>(new Map());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("link_health" as any)
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      const map = new Map<string, LinkHealthEntry>();
      for (const row of data as any[]) {
        map.set(row.favorite_id, {
          id: row.id,
          favorite_id: row.favorite_id,
          source_url: row.source_url,
          status: row.status,
          last_checked_at: row.last_checked_at,
          fail_count: row.fail_count,
          last_error: row.last_error,
        });
      }
      setHealthMap(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const getHealth = useCallback((favoriteId: string): LinkHealthEntry | null => {
    return healthMap.get(favoriteId) ?? null;
  }, [healthMap]);

  const brokenCount = Array.from(healthMap.values()).filter(
    (h) => h.status === "broken" || h.status === "expired"
  ).length;

  /** Trigger a manual health check via edge function */
  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke("platform-api", {
        body: { route: "link-health" },
      });
      await load();
    } finally {
      setLoading(false);
    }
  }, [load]);

  return { healthMap, getHealth, brokenCount, loading, reload: load, runHealthCheck };
}
