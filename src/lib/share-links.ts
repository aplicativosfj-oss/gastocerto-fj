import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { createShareLink } from "@/lib/share-links.functions";

export type ShareLink = Tables<"share_links">;

export function shareLinkUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/compartilhado/${token}`;
}

export function shareLinkStatus(link: ShareLink) {
  if (link.revoked_at) return "revogado" as const;
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return "expirado" as const;
  return "ativo" as const;
}

export function useShareLinks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["share-links", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ShareLink[]> => {
      const { data, error } = await supabase
        .from("share_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ShareLinkInput = {
  label?: string;
  password: string;
  year: number;
  month: number;
  includeTransactions: boolean;
  includeNotes: boolean;
  includeTotals: boolean;
  includeCharts: boolean;
  includeCategories: boolean;
  includeAmounts: boolean;
  /** Data e hora exatas de expiração em ISO, ou `null` para nunca expirar. */
  expiresAt: string | null;
};

export function useCreateShareLink() {
  const queryClient = useQueryClient();
  const create = useServerFn(createShareLink);
  return useMutation({
    mutationFn: async (input: ShareLinkInput) => create({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share-links"] }),
  });
}

export function useRevokeShareLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("share_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share-links"] }),
  });
}

export function useDeleteShareLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("share_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share-links"] }),
  });
}
