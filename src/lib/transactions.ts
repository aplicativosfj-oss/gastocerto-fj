import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Transaction = Tables<"transactions">;
export type Category = Tables<"categories">;
export type Account = Tables<"accounts">;
export type Budget = Tables<"budgets">;

export type TransactionRange = { start: string; end: string };

export function useTransactions(range?: TransactionRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id, range?.start ?? "all", range?.end ?? "all"],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Transaction[]> => {
      let query = supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (range) {
        query = query.gte("transaction_date", range.start).lte("transaction_date", range.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Último lançamento do tipo informado — usado para pré-preencher o formulário. */
export function useLastTransaction(kind: Transaction["transaction_type"]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["last-transaction", user?.id, kind],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async (): Promise<Transaction | null> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("transaction_type", kind)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}



export function useAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["accounts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgets(year: number, month: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budgets", user?.id, year, month],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("year", year)
        .eq("month", month);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Invalida tudo que depende de lançamentos (métricas, gráficos, orçamentos). */
export function useRefreshFinance() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
    ]);
  };
}

export function useSaveTransaction() {
  const { user } = useAuth();
  const refresh = useRefreshFinance();

  return useMutation({
    mutationFn: async (input: { id?: string; values: Omit<TablesInsert<"transactions">, "user_id"> }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { data, error } = await supabase
          .from("transactions")
          .update(input.values as TablesUpdate<"transactions">)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...input.values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
  });
}

export function useDeleteTransaction() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useRestoreTransaction() {
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useSaveCategory() {
  const { user } = useAuth();
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: async (input: { id?: string; values: Omit<TablesInsert<"categories">, "user_id"> }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("categories")
          .update(input.values as TablesUpdate<"categories">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("categories")
        .insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useSaveBudget() {
  const { user } = useAuth();
  const refresh = useRefreshFinance();
  return useMutation({
    mutationFn: async (values: Omit<TablesInsert<"budgets">, "user_id">) => {
      if (!user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("budgets")
        .upsert(
          { ...values, user_id: user.id },
          { onConflict: "user_id,year,month,category_id" },
        );
      if (error) {
        // Fallback quando o upsert por índice parcial não é aplicável.
        const { error: insertError } = await supabase
          .from("budgets")
          .insert({ ...values, user_id: user.id });
        if (insertError) throw insertError;
      }
    },
    onSuccess: refresh,
  });
}
