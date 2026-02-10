import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TeraBoxFile } from "@/types/terabox";

export interface DownloadHistoryItem {
  id: string;
  file_name: string;
  file_size: string | null;
  file_type: string | null;
  download_link: string;
  status: string;
  created_at: string;
}

export function useDownloadHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("download_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as DownloadHistoryItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const recordDownload = useCallback(async (file: TeraBoxFile) => {
    if (!user) return;
    await supabase.from("download_history").insert({
      user_id: user.id,
      file_name: file.name,
      file_size: file.size_formatted,
      file_type: file.type,
      download_link: file.download_link,
      status: "completed",
    });
    fetchHistory();
  }, [user, fetchHistory]);

  return { history, loading, recordDownload, fetchHistory };
}
