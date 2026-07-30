import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Notification = Tables<"notifications">;
export type NotificationPreferences = Tables<"notification_preferences">;

export type NotificationDraft = {
  notification_type: string;
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
  link?: string | null;
  reference_id?: string | null;
  reference_date?: string | null;
  dedupe_key: string;
};

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ ...values, user_id: user.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notification_preferences", user?.id] }),
  });
}

export function useMarkNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids?: string[]; all?: boolean }) => {
      if (!user) throw new Error("Sessão expirada");
      let query = supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (!input.all && input.ids?.length) query = query.in("id", input.ids);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

export function useDeleteNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

/**
 * Persiste lembretes gerados no cliente, ignorando duplicados via dedupe_key.
 * A unicidade é garantida pelo índice (user_id, dedupe_key) no banco.
 */
export function useSyncNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (drafts: NotificationDraft[]) => {
      if (!user || drafts.length === 0) return 0;
      const rows = drafts.map((draft) => ({
        ...draft,
        severity: draft.severity ?? "info",
        user_id: user.id,
      }));
      const { data, error } = await supabase
        .from("notifications")
        .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: (created) => {
      if (created) queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}
