import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/appwrite";

async function fetchSection(section: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats?section=${section}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to fetch admin stats");
  }

  return response.json();
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => fetchSection("overview"),
    refetchInterval: 30000,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchSection("users"),
    refetchInterval: 30000,
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: () => fetchSection("recent-activity"),
    refetchInterval: 15000,
  });
}

export function useAdminErrors() {
  return useQuery({
    queryKey: ["admin", "errors"],
    queryFn: () => fetchSection("errors"),
  });
}

export function useAdminStorage() {
  return useQuery({
    queryKey: ["admin", "storage"],
    queryFn: () => fetchSection("storage"),
    refetchInterval: 60000,
  });
}

export function useAdminApiMonitor() {
  return useQuery({
    queryKey: ["admin", "api-monitor"],
    queryFn: () => fetchSection("api-monitor"),
    refetchInterval: 60000,
  });
}

export function useManageRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, targetUserId, role }: { action: "assign" | "remove"; targetUserId: string; role: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, targetUserId, role }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to manage role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, targetUserId }: { action: "ban" | "unban"; targetUserId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, targetUserId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to ${action} user`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
