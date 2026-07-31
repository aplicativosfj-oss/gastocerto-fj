import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { MONTH_NAMES, isoDate, monthRange, toCents } from "@/lib/finance";
import type { Transaction } from "@/lib/transactions";

export type MonthlyClosing = Tables<"monthly_closings">;

/**
 * Marco inicial do balancete. Julho/2026 é o mês de implantação: aceita
 * lançamentos retroativos do mês inteiro. De agosto/2026 em diante cada
 * competência conta do dia 1º ao último dia do mês.
 */
export const BALANCE_START = { year: 2026, month: 7 } as const;

export function isImplantationMonth(year: number, month: number) {
  return year === BALANCE_START.year && month === BALANCE_START.month;
}

export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

/** Lista de competências de julho/2026 até o mês corrente (mais recente primeiro). */
export function listCompetences(reference = new Date()) {
  const months: Array<{ year: number; month: number }> = [];
  let year: number = BALANCE_START.year;
  let month: number = BALANCE_START.month;
  const endYear = reference.getFullYear();
  const endMonth = reference.getMonth() + 1;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months.reverse();
}

export type MonthBalance = {
  year: number;
  month: number;
  label: string;
  range: { start: string; end: string };
  income: number;
  expense: number;
  opening: number;
  closing: number;
  result: number;
  count: number;
  closed: MonthlyClosing | null;
  isCurrent: boolean;
  isImplantation: boolean;
};

/** Fechamentos já gravados pelo usuário. */
export function useClosings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["monthly-closings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<MonthlyClosing[]> => {
      const { data, error } = await supabase
        .from("monthly_closings")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Todos os lançamentos desde o marco inicial, usados para o balancete. */
export function useBalanceTransactions() {
  const { user } = useAuth();
  const start = monthRange(BALANCE_START.year, BALANCE_START.month).start;

  return useQuery({
    queryKey: ["balance-transactions", user?.id, start],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .gte("transaction_date", start)
        .order("transaction_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Monta o balancete mês a mês encadeando o saldo final no saldo inicial seguinte. */
export function buildBalance(
  transactions: Transaction[],
  closings: MonthlyClosing[],
  reference = new Date(),
): MonthBalance[] {
  const competences = listCompetences(reference).slice().reverse();
  const today = isoDate(reference);
  const currentKey = today.slice(0, 7);
  const closedMap = new Map(closings.map((row) => [`${row.year}-${row.month}`, row]));

  let carry = 0;
  const rows: MonthBalance[] = competences.map(({ year, month }) => {
    const range = monthRange(year, month);
    const inMonth = transactions.filter(
      (row) =>
        row.transaction_date >= range.start &&
        row.transaction_date <= range.end &&
        row.status !== "canceled",
    );
    const income = toCents(
      inMonth
        .filter((row) => row.transaction_type === "income")
        .reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const expense = toCents(
      inMonth
        .filter((row) => row.transaction_type === "expense")
        .reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const opening = carry;
    const closing = toCents(opening + income - expense);
    carry = closing;

    return {
      year,
      month,
      label: monthLabel(year, month),
      range: { start: range.start, end: range.end },
      income,
      expense,
      opening,
      closing,
      result: toCents(income - expense),
      count: inMonth.length,
      closed: closedMap.get(`${year}-${month}`) ?? null,
      isCurrent: range.start.slice(0, 7) === currentKey,
      isImplantation: isImplantationMonth(year, month),
    };
  });

  return rows.reverse();
}

/** Grava (ou atualiza) o fechamento de uma competência. */
export function useCloseMonth() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { balance: MonthBalance; notes?: string }) => {
      if (!user) throw new Error("Sessão expirada");
      const { balance, notes } = input;
      const { error } = await supabase.from("monthly_closings").upsert(
        {
          user_id: user.id,
          year: balance.year,
          month: balance.month,
          opening_balance: balance.opening,
          total_income: balance.income,
          total_expense: balance.expense,
          closing_balance: balance.closing,
          closed_at: new Date().toISOString(),
          notes: notes?.trim() ? notes.trim().slice(0, 300) : null,
        },
        { onConflict: "user_id,year,month" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-closings"] });
    },
  });
}

/** Reabre uma competência removendo o fechamento gravado. */
export function useReopenMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monthly_closings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-closings"] });
    },
  });
}
