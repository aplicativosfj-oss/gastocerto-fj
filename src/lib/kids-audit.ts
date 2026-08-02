import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type KidsAuditAction =
  | "mesada_automatica"
  | "conquista"
  | "resgate"
  | "alerta"
  | "meta"
  | "lancamento";

export type KidsAuditEntry = {
  id: string;
  user_id: string;
  dependent_id: string | null;
  action: KidsAuditAction | string;
  title: string;
  description: string | null;
  amount: number | null;
  metadata: Record<string, unknown>;
  dedupe_key: string | null;
  created_at: string;
};

export const KIDS_AUDIT_ACTIONS: { value: KidsAuditAction; label: string }[] = [
  { value: "mesada_automatica", label: "Mesada automática" },
  { value: "conquista", label: "Conquista de meta" },
  { value: "resgate", label: "Resgate de recompensa" },
  { value: "alerta", label: "Alerta ao responsável" },
  { value: "meta", label: "Meta criada / editada" },
  { value: "lancamento", label: "Lançamento da criança" },
];

export function kidsAuditActionLabel(action: string) {
  return KIDS_AUDIT_ACTIONS.find((item) => item.value === action)?.label ?? "Ação";
}

/** Histórico completo das ações do Espaço Kids do responsável. */
export function useKidsAuditLog(dependentId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kids_audit_log", user?.id, dependentId ?? "all"],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<KidsAuditEntry[]> => {
      let query = supabase
        .from("kids_audit_log" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (dependentId) query = query.eq("dependent_id", dependentId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as KidsAuditEntry[];
    },
  });
}

export type KidsAuditDraft = {
  dependent_id?: string | null;
  action: KidsAuditAction;
  title: string;
  description?: string | null;
  amount?: number | null;
  metadata?: Record<string, unknown>;
  /** Evita registros duplicados da mesma ação (ex.: mesada do mês). */
  dedupe_key?: string | null;
};

/**
 * Grava uma ação no histórico do Espaço Kids. Nunca lança erro para a tela: o
 * histórico é complementar e não deve travar o fluxo da criança.
 */
export function useLogKidsAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    async (draft: KidsAuditDraft) => {
      if (!user) return;
      try {
        const { error } = await supabase.from("kids_audit_log" as never).insert({
          user_id: user.id,
          dependent_id: draft.dependent_id ?? null,
          action: draft.action,
          title: draft.title,
          description: draft.description ?? null,
          amount: draft.amount ?? null,
          metadata: draft.metadata ?? {},
          dedupe_key: draft.dedupe_key ?? null,
        } as never);
        if (error && error.code !== "23505") return;
        void queryClient.invalidateQueries({ queryKey: ["kids_audit_log"] });
      } catch {
        // silencioso
      }
    },
    [user, queryClient],
  );
}

/** Limpa o histórico do Espaço Kids (apenas do próprio responsável). */
export function useClearKidsAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("kids_audit_log" as never)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kids_audit_log"] });
    },
  });
}
