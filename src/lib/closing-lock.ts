import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { BALANCE_START, type MonthlyClosing } from "@/lib/closing";

export type ReopenRequest = Tables<"closing_reopen_requests">;

/** Primeira data aceita pelo sistema (início do balancete). */
export const MIN_TRANSACTION_DATE = `${BALANCE_START.year}-${String(BALANCE_START.month).padStart(2, "0")}-01`;

export const REOPEN_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando análise",
  approved: "Liberado",
  rejected: "Recusado",
};

/** Verdadeiro quando a competência está fechada e sem liberação válida. */
export function isClosingLocked(closing: MonthlyClosing | null | undefined) {
  if (!closing || !closing.locked) return false;
  if (!closing.reopened_until) return true;
  return new Date(closing.reopened_until).getTime() < Date.now();
}

/** Mapa "ano-mês" -> fechamento, para checar bloqueio por data. */
export function lockedMonthKeys(closings: MonthlyClosing[]) {
  const keys = new Set<string>();
  closings.forEach((closing) => {
    if (isClosingLocked(closing)) {
      keys.add(`${closing.year}-${String(closing.month).padStart(2, "0")}`);
    }
  });
  return keys;
}

/** Pedidos de liberação do próprio cliente. */
export function useMyReopenRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reopen-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ReopenRequest[]> => {
      const { data, error } = await supabase
        .from("closing_reopen_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Todos os pedidos (administradores e suporte). */
export function useAllReopenRequests() {
  return useQuery({
    queryKey: ["reopen-requests", "all"],
    queryFn: async (): Promise<ReopenRequest[]> => {
      const { data, error } = await supabase
        .from("closing_reopen_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateReopenRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { year: number; month: number; reason: string }) => {
      if (!user) throw new Error("Sessão expirada");
      const reason = input.reason.trim();
      if (reason.length < 10) throw new Error("Descreva o motivo com pelo menos 10 caracteres.");
      const { error } = await supabase.from("closing_reopen_requests").insert({
        user_id: user.id,
        year: input.year,
        month: input.month,
        reason: reason.slice(0, 500),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reopen-requests"] }),
  });
}

/**
 * Decisão do administrador. Ao aprovar, abre uma janela temporária de edição
 * no fechamento correspondente, preservando o histórico do mês.
 */
export function useDecideReopenRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request: ReopenRequest;
      approve: boolean;
      hours?: number;
      note?: string;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      const { request, approve, hours = 48, note } = input;
      const until = approve
        ? new Date(Date.now() + Math.max(1, hours) * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from("closing_reopen_requests")
        .update({
          status: approve ? "approved" : "rejected",
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          reopen_until: until,
          admin_note: note?.trim() ? note.trim().slice(0, 300) : null,
        })
        .eq("id", request.id);
      if (error) throw error;

      if (approve) {
        const { error: closingError } = await supabase
          .from("monthly_closings")
          .update({ reopened_until: until, reopened_by: user.id, reopen_note: note ?? null })
          .eq("user_id", request.user_id)
          .eq("year", request.year)
          .eq("month", request.month);
        if (closingError) throw closingError;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reopen-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["monthly-closings"] });
    },
  });
}
