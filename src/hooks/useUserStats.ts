import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserStats {
  totalDownloads: number;
  totalFavorites: number;
  totalWatchTime: number; // in minutes
  streamsThisWeek: number;
  mostWatchedType: string | null;
  joinedDate: Date | null;
  downloadTrend: number; // percentage change
}

const WATCH_TIME_KEY = "omnistream_watch_time";

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalDownloads: 0,
    totalFavorites: 0,
    totalWatchTime: 0,
    streamsThisWeek: 0,
    mostWatchedType: null,
    joinedDate: null,
    downloadTrend: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch download history count
      const { count: downloadCount } = await supabase
        .from("download_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch downloads from last week for trend
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: recentDownloads } = await supabase
        .from("download_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      // Fetch favorites count
      const { count: favCount } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get watch time from local storage
      const storedWatchTime = localStorage.getItem(WATCH_TIME_KEY);
      const watchTimeMinutes = storedWatchTime ? Math.round(parseInt(storedWatchTime) / 60) : 0;

      // Get file type distribution from favorites
      const { data: favorites } = await supabase
        .from("favorites")
        .select("file_type")
        .eq("user_id", user.id);

      const typeCounts: Record<string, number> = {};
      favorites?.forEach((f) => {
        if (f.file_type) {
          typeCounts[f.file_type] = (typeCounts[f.file_type] || 0) + 1;
        }
      });
      const mostWatched = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

      // Calculate trend (simple: recent vs historical average)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { count: twoWeekDownloads } = await supabase
        .from("download_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", twoWeeksAgo.toISOString());

      const previousWeek = (twoWeekDownloads || 0) - (recentDownloads || 0);
      const trend = previousWeek > 0 
        ? Math.round(((recentDownloads || 0) - previousWeek) / previousWeek * 100)
        : 0;

      setStats({
        totalDownloads: downloadCount || 0,
        totalFavorites: favCount || 0,
        totalWatchTime: watchTimeMinutes,
        streamsThisWeek: recentDownloads || 0,
        mostWatchedType: mostWatched?.[0] || null,
        joinedDate: user.created_at ? new Date(user.created_at) : null,
        downloadTrend: trend,
      });
    } catch (error) {
      console.error("[UserStats] Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Track watch time
  const addWatchTime = useCallback((seconds: number) => {
    const current = parseInt(localStorage.getItem(WATCH_TIME_KEY) || "0");
    localStorage.setItem(WATCH_TIME_KEY, String(current + seconds));
  }, []);

  return { stats, loading, refetch: fetchStats, addWatchTime };
}
