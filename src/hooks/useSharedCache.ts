import { useCallback } from "react";
import { supabase } from "@/lib/appwrite";
import { useAuth } from "@/contexts/AuthContext";
import type { TeraBoxFile, TeraBoxResponse } from "@/types/terabox";

/**
 * Shared cache: when any user fetches a URL, the result is stored in a shared table.
 * Other users fetching the same URL within 8 hours get the cached data — no API call.
 */
export function useSharedCache() {
  const { user } = useAuth();

  /** Check if a URL has valid cached data from any user */
  const getFromSharedCache = useCallback(async (sourceUrl: string): Promise<TeraBoxResponse | null> => {
    const key = sourceUrl.trim().toLowerCase();

    const { data } = await supabase
      .from("shared_cache" as any)
      .select("file_data, file_count, created_at, expires_at")
      .eq("source_url", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!data) return null;

    const files = (data as any).file_data as TeraBoxFile[];
    return {
      status: "success",
      total_files: (data as any).file_count,
      list: files,
    };
  }, []);

  /** Save fetch result to shared cache for other users */
  const saveToSharedCache = useCallback(async (sourceUrl: string, files: TeraBoxFile[]) => {
    const key = sourceUrl.trim().toLowerCase();

    await supabase.from("shared_cache" as any).upsert(
      {
        source_url: key,
        file_data: files as any,
        file_count: files.length,
        fetched_by: user?.id ?? null,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "source_url" }
    );
  }, [user]);

  return { getFromSharedCache, saveToSharedCache };
}
