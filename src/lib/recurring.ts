import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isoDate } from "@/lib/finance";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type RecurringRule = Tables<"recurring_rules">;

export const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
] as const;

export function useRecurringRules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recurring-rules", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<RecurringRule[]> => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Lançamentos já gerados por regras recorrentes. */
export function useRecurringTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recurring-transactions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .not("recurring_rule_id", "is", null)
        .is("deleted_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useRefreshRecurring() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] }),
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  };
}

export function useSaveRecurringRule() {
  const { user } = useAuth();
  const refresh = useRefreshRecurring();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Omit<TablesInsert<"recurring_rules">, "user_id">;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("recurring_rules")
          .update(input.values as TablesUpdate<"recurring_rules">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("recurring_rules")
        .insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useDeleteRecurringRule() {
  const refresh = useRefreshRecurring();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useToggleRecurringRule() {
  const refresh = useRefreshRecurring();
  return useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("recurring_rules")
        .update({ active: input.active })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useSettleTransaction() {
  const refresh = useRefreshRecurring();
  return useMutation({
    mutationFn: async (input: { id: string; status: "paid" | "pending" }) => {
      const today = isoDate(new Date());
      const { data: row } = await supabase
        .from("transactions")
        .select("due_date")
        .eq("id", input.id)
        .maybeSingle();

      const status =
        input.status === "pending" && row?.due_date && row.due_date < today
          ? "overdue"
          : input.status;

      const { error } = await supabase
        .from("transactions")
        .update({
          status,
          payment_date: input.status === "paid" ? isoDate(new Date()) : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

/**
 * Atualiza automaticamente o status dos lançamentos recorrentes:
 * pendentes vencidos viram "atrasado" e atrasados com vencimento futuro voltam
 * para "pendente".
 */
export function useSyncRecurringStatus() {
  const { user } = useAuth();
  const refresh = useRefreshRecurring();

  return useMutation({
    mutationFn: async () => {
      if (!user) return { updated: 0 };
      const today = isoDate(new Date());

      const { error: overdueError, count: overdueCount } = await supabase
        .from("transactions")
        .update({ status: "overdue" }, { count: "exact" })
        .eq("status", "pending")
        .lt("due_date", today)
        .is("deleted_at", null);
      if (overdueError) throw overdueError;

      const { error: pendingError, count: pendingCount } = await supabase
        .from("transactions")
        .update({ status: "pending" }, { count: "exact" })
        .eq("status", "overdue")
        .gte("due_date", today)
        .is("deleted_at", null);
      if (pendingError) throw pendingError;

      return { updated: (overdueCount ?? 0) + (pendingCount ?? 0) };
    },
    onSuccess: refresh,
  });
}


/* -------------------------------------------------------------------------- */
/* Geração automática                                                          */
/* -------------------------------------------------------------------------- */

function addMonths(date: Date, months: number) {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function advance(date: Date, frequency: string) {
  switch (frequency) {
    case "weekly":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    case "biweekly":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14);
    case "bimonthly":
      return addMonths(date, 2);
    case "quarterly":
      return addMonths(date, 3);
    case "semiannual":
      return addMonths(date, 6);
    case "annual":
      return addMonths(date, 12);
    default:
      return addMonths(date, 1);
  }
}

/** Datas de vencimento previstas de uma regra até o horizonte informado. */
export function occurrencesFor(rule: RecurringRule, horizon: Date): string[] {
  const dates: string[] = [];
  const [year, month, day] = rule.start_date.split("-").map(Number);
  let cursor = new Date(year, month - 1, day);

  if (rule.day_of_month && rule.frequency !== "weekly" && rule.frequency !== "biweekly") {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    cursor.setDate(Math.min(rule.day_of_month, lastDay));
    if (cursor < new Date(year, month - 1, day)) cursor = advance(cursor, rule.frequency);
  }

  let guard = 0;
  while (cursor <= horizon && guard < 500) {
    guard += 1;
    const value = isoDate(cursor);
    if (rule.end_date && value > rule.end_date) break;
    dates.push(value);
    cursor = advance(cursor, rule.frequency);
  }
  return dates;
}

/**
 * Gera os lançamentos pendentes das regras ativas até o fim do próximo mês.
 * Nunca duplica: consulta as datas já geradas e ainda conta com um índice único
 * em (recurring_rule_id, due_date) no banco.
 */
export function useGenerateRecurring() {
  const { user } = useAuth();
  const refresh = useRefreshRecurring();

  return useMutation({
    mutationFn: async (rules: RecurringRule[]) => {
      if (!user) throw new Error("Sessão expirada");
      const active = rules.filter((rule) => rule.active);
      if (active.length === 0) return { created: 0 };

      const today = new Date();
      const horizon = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      const todayIso = isoDate(today);

      const { data: existing, error: existingError } = await supabase
        .from("transactions")
        .select("recurring_rule_id, due_date")
        .in(
          "recurring_rule_id",
          active.map((rule) => rule.id),
        );
      if (existingError) throw existingError;

      const taken = new Set(
        (existing ?? []).map((row) => `${row.recurring_rule_id}|${row.due_date}`),
      );

      const rows: TablesInsert<"transactions">[] = [];
      for (const rule of active) {
        for (const dueDate of occurrencesFor(rule, horizon)) {
          const key = `${rule.id}|${dueDate}`;
          if (taken.has(key)) continue;
          taken.add(key);
          rows.push({
            user_id: user.id,
            recurring_rule_id: rule.id,
            description: rule.description,
            amount: rule.amount,
            transaction_type: rule.transaction_type,
            category_id: rule.category_id,
            account_id: rule.account_id,
            payment_method: rule.payment_method,
            expense_type: rule.transaction_type === "expense" ? "recorrente" : null,
            transaction_date: dueDate,
            due_date: dueDate,
            is_recurring: true,
            is_essential: rule.is_essential,
            notes: rule.notes,
            status: dueDate < todayIso ? "overdue" : "pending",
          });
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("transactions").insert(rows);
        // 23505 = duplicidade barrada pelo índice único; ignoramos com segurança.
        if (error && error.code !== "23505") throw error;

        await supabase
          .from("recurring_rules")
          .update({ last_generated_date: isoDate(horizon) })
          .in(
            "id",
            active.map((rule) => rule.id),
          );
      }

      // Marca como atrasados os pendentes vencidos.
      await supabase
        .from("transactions")
        .update({ status: "overdue" })
        .eq("status", "pending")
        .lt("due_date", todayIso)
        .is("deleted_at", null);

      return { created: rows.length };
    },
    onSuccess: refresh,
  });
}

/* -------------------------------------------------------------------------- */
/* Geração automática ao abrir o app                                          */
/* -------------------------------------------------------------------------- */

/**
 * Garante que as contas recorrentes já estejam contabilizadas nos gastos:
 * gera os lançamentos das regras ativas e atualiza os status uma vez por dia,
 * sem precisar entrar na tela de recorrências.
 */
export function useAutoRecurring() {
  const { user } = useAuth();
  const { data: rules } = useRecurringRules();
  const generate = useGenerateRecurring();
  const sync = useSyncRecurringStatus();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || !rules || ran.current) return;
    const today = isoDate(new Date());
    const storageKey = `gc:auto-recurring:${user.id}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(storageKey) === today) return;
    ran.current = true;

    void (async () => {
      try {
        if (rules.some((rule) => rule.active)) {
          await generate.mutateAsync(rules);
        }
        await sync.mutateAsync();
        if (typeof window !== "undefined") window.localStorage.setItem(storageKey, today);
      } catch (error) {
        console.error("[recorrencia] geração automática falhou", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, rules]);
}
