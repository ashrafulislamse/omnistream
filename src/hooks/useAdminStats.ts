import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/appwrite";

async function fetchSection(section: string) {
  const { data, error } = await supabase.functions.invoke("platform-api", {
    body: { route: "admin", section },
  });

  if (error) throw new Error(error.message || "Failed to fetch admin stats");
  if (data?.error) throw new Error(data.error);
  return data;
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
      const { data, error } = await supabase.functions.invoke("platform-api", {
        body: { route: "admin", action, targetUserId, role },
      });

      if (error) throw new Error(error.message || "Failed to manage role");
      if (data?.error) throw new Error(data.error);
      return data;
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
      const { data, error } = await supabase.functions.invoke("platform-api", {
        body: { route: "admin", action, targetUserId },
      });

      if (error) throw new Error(error.message || `Failed to ${action} user`);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
