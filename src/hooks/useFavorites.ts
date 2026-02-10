import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TeraBoxFile } from "@/types/terabox";

export interface FavoriteItem {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: string | null;
  thumbnail: string | null;
  download_link: string;
  fast_download_link: string | null;
  stream_url: string | null;
  source_url: string | null;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select("*")
      .order("created_at", { ascending: false });
    setFavorites((data as FavoriteItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const addFavorite = useCallback(async (file: TeraBoxFile, sourceUrl?: string) => {
    if (!user) return;
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size_formatted,
      thumbnail: file.thumbnail,
      download_link: file.download_link,
      fast_download_link: file.fast_download_link,
      stream_url: file.stream_url,
      source_url: sourceUrl,
    });
    if (!error) fetchFavorites();
    return { error: error?.message ?? null };
  }, [user, fetchFavorites]);

  const removeFavorite = useCallback(async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const isFavorited = useCallback((fileName: string) => {
    return favorites.some((f) => f.file_name === fileName);
  }, [favorites]);

  return { favorites, loading, addFavorite, removeFavorite, isFavorited, fetchFavorites };
}
