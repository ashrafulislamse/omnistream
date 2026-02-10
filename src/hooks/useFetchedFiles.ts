import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TeraBoxFile } from "@/types/terabox";

export interface FetchedFilesEntry {
  id: string;
  source_url: string;
  files: TeraBoxFile[];
  file_count: number;
  created_at: string;
}

export function useFetchedFiles() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FetchedFilesEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("fetched_files")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setEntries(
        data.map((d: any) => ({
          id: d.id,
          source_url: d.source_url,
          files: d.file_data as TeraBoxFile[],
          file_count: d.file_count,
          created_at: d.created_at,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (sourceUrl: string, files: TeraBoxFile[]) => {
    if (!user) return;
    await supabase.from("fetched_files").upsert(
      {
        user_id: user.id,
        source_url: sourceUrl.trim(),
        file_data: files as any,
        file_count: files.length,
      },
      { onConflict: "user_id,source_url" }
    );
    await load();
  }, [user, load]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("fetched_files").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, save, remove, reload: load };
}
