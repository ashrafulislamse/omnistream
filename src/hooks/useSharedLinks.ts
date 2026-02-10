import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/appwrite";
import { useAuth } from "@/contexts/AuthContext";
import type { TeraBoxFile } from "@/types/terabox";

export interface SharedLink {
  id: string;
  share_code: string;
  title: string | null;
  source_url: string;
  file_data: TeraBoxFile[];
  file_count: number;
  view_count: number;
  expires_at: string | null;
  created_at: string;
}

export function useSharedLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("shared_links" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setLinks(
        (data as any[]).map((d) => ({
          id: d.id,
          share_code: d.share_code,
          title: d.title,
          source_url: d.source_url,
          file_data: d.file_data as TeraBoxFile[],
          file_count: d.file_count,
          view_count: d.view_count,
          expires_at: d.expires_at,
          created_at: d.created_at,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createShareLink = useCallback(async (
    sourceUrl: string,
    files: TeraBoxFile[],
    title?: string
  ): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("shared_links" as any)
      .insert({
        user_id: user.id,
        source_url: sourceUrl,
        file_data: files as any,
        file_count: files.length,
        title: title || files[0]?.name || "Shared Files",
      })
      .select("share_code")
      .single();

    if (error || !data) return null;
    await load();
    return (data as any).share_code;
  }, [user, load]);

  const deleteShareLink = useCallback(async (id: string) => {
    await supabase.from("shared_links" as any).delete().eq("id", id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { links, loading, createShareLink, deleteShareLink, reload: load };
}

/** Fetch a shared link by its public share code using security definer function */
export async function fetchSharedLink(shareCode: string): Promise<SharedLink | null> {
  const { data, error } = await supabase
    .rpc("get_shared_link_by_code" as any, { _share_code: shareCode });

  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;

  // Increment view count via security definer function
  supabase.rpc("increment_shared_link_views" as any, { _share_code: shareCode }).then(() => {});

  const d = Array.isArray(data) ? data[0] : data;
  return {
    id: d.id,
    share_code: d.share_code,
    title: d.title,
    source_url: d.source_url,
    file_data: d.file_data as TeraBoxFile[],
    file_count: d.file_count,
    view_count: d.view_count,
    expires_at: d.expires_at,
    created_at: d.created_at,
  };
}
