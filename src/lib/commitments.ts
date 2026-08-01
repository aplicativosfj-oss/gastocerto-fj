import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { isoDate, toCents } from "@/lib/finance";

export type Commitment = Tables<"commitments">;
export type CommitmentEntry = Tables<"commitment_entries">;

/**
 * Tipos de compromisso (saídas com controle próprio). `openAccount` marca os
 * casos de conta aberta/fiado, em que o saldo devedor é a soma das compras
 * lançadas menos os pagamentos — não há parcela fixa.
 */
export const COMMITMENT_TYPES = [
  { value: "financiamento", label: "Financiamento", openAccount: false },
  { value: "emprestimo", label: "Empréstimo", openAccount: false },
  { value: "cartao_credito", label: "Cartão de crédito", openAccount: true },
  { value: "compra_prazo", label: "Compra a prazo / parcelada", openAccount: false },
  { value: "fiado", label: "Fiado no comércio", openAccount: true },
  { value: "acougue", label: "Açougue (conta aberta)", openAccount: true },
  { value: "pensao_alimenticia", label: "Pensão alimentícia", openAccount: false },
  { value: "consorcio", label: "Consórcio", openAccount: false },
  { value: "mensalidade", label: "Mensalidade / assinatura", openAccount: false },
  { value: "outro", label: "Outra saída", openAccount: false },
] as const;

export type CommitmentTypeValue = (typeof COMMITMENT_TYPES)[number]["value"];

export const COMMITMENT_STATUS = [
  { value: "open", label: "Em andamento" },
  { value: "paid", label: "Quitado" },
  { value: "suspended", label: "Suspenso" },
  { value: "canceled", label: "Cancelado" },
] as const;

export const ENTRY_TYPES = [
  { value: "payment", label: "Pagamento" },
  { value: "charge", label: "Nova compra / cobrança" },
  { value: "interest", label: "Juros / encargos" },
  { value: "discount", label: "Desconto / abatimento" },
] as const;

export function commitmentTypeLabel(value: string | null | undefined) {
  return COMMITMENT_TYPES.find((item) => item.value === value)?.label ?? "Outra saída";
}

export function isOpenAccountType(value: string | null | undefined) {
  return COMMITMENT_TYPES.find((item) => item.value === value)?.openAccount ?? false;
}

export type CommitmentSummary = {
  commitment: Commitment;
  entries: CommitmentEntry[];
  /** Total contratado (parcelado) ou total de compras lançadas (conta aberta). */
  contracted: number;
  paid: number;
  charged: number;
  /** Saldo devedor restante. */
  outstanding: number;
  paidInstallments: number;
  progress: number;
  nextDue: string | null;
  daysToDue: number | null;
  overdue: boolean;
  lastEntryDate: string | null;
};

export function useCommitments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["commitments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Commitment[]> => {
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Todos os movimentos do usuário — o resumo por compromisso é calculado localmente. */
export function useCommitmentEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["commitment-entries", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CommitmentEntry[]> => {
      const { data, error } = await supabase
        .from("commitment_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCommitment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Omit<TablesInsert<"commitments">, "user_id">;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("commitments")
          .update(input.values)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("commitments")
        .insert({ ...input.values, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["commitments"] });
    },
  });
}

export function useDeleteCommitment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commitments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["commitments"] });
      void queryClient.invalidateQueries({ queryKey: ["commitment-entries"] });
    },
  });
}

export function useSaveCommitmentEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Omit<TablesInsert<"commitment_entries">, "user_id">;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("commitment_entries")
          .update(input.values)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("commitment_entries")
        .insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["commitment-entries"] });
    },
  });
}

export function useDeleteCommitmentEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commitment_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["commitment-entries"] });
    },
  });
}

function diffDays(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** Próximo vencimento: usa a data informada ou calcula pelo dia do mês. */
export function nextDueDate(commitment: Commitment, reference = new Date()): string | null {
  if (commitment.next_due_date) return commitment.next_due_date;
  if (!commitment.due_day) return null;
  const day = Math.min(Math.max(commitment.due_day, 1), 28);
  const candidate = new Date(reference.getFullYear(), reference.getMonth(), day);
  if (candidate < reference) candidate.setMonth(candidate.getMonth() + 1);
  return isoDate(candidate);
}

export function summarizeCommitment(
  commitment: Commitment,
  allEntries: CommitmentEntry[],
  reference = new Date(),
): CommitmentSummary {
  const entries = allEntries
    .filter((entry) => entry.commitment_id === commitment.id)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

  const sumOf = (type: string) =>
    toCents(
      entries
        .filter((entry) => entry.entry_type === type)
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
    );

  const paid = toCents(sumOf("payment") + sumOf("discount"));
  const charged = toCents(sumOf("charge") + sumOf("interest"));
  const openAccount = commitment.is_open_account || isOpenAccountType(commitment.commitment_type);

  const contracted = openAccount
    ? toCents(Number(commitment.total_amount ?? 0) + charged)
    : toCents(Number(commitment.total_amount ?? 0) + charged);

  const outstanding = toCents(Math.max(contracted - paid, 0));
  const progress = contracted > 0 ? Math.min((paid / contracted) * 100, 100) : 0;
  const installmentAmount = Number(commitment.installment_amount ?? 0);
  const paidInstallments =
    installmentAmount > 0 ? Math.floor(paid / installmentAmount) : entries.filter((e) => e.entry_type === "payment").length;

  const due = nextDueDate(commitment, reference);
  const today = isoDate(reference);
  const daysToDue = due ? diffDays(today, due) : null;

  return {
    commitment,
    entries,
    contracted,
    paid,
    charged,
    outstanding,
    paidInstallments,
    progress,
    nextDue: due,
    daysToDue,
    overdue:
      commitment.status === "open" && outstanding > 0 && daysToDue !== null && daysToDue < 0,
    lastEntryDate: entries[0]?.entry_date ?? null,
  };
}

export function summarizeAll(
  commitments: Commitment[],
  entries: CommitmentEntry[],
  reference = new Date(),
): CommitmentSummary[] {
  return commitments.map((commitment) => summarizeCommitment(commitment, entries, reference));
}

/** Marca usada para reconhecer as parcelas geradas automaticamente. */
export function commitmentTag(commitmentId: string) {
  return `compromisso:${commitmentId}`;
}

/** Data mínima permitida pelo sistema para lançamentos. */
const MIN_TRANSACTION_DATE = "2026-07-01";

/**
 * Reconcilia as parcelas geradas automaticamente do compromisso: cria as que
 * faltam, corrige data/valor das pendentes que mudaram, remove as pendentes
 * que não existem mais no cronograma e nunca mexe nas parcelas já pagas.
 * A operação é idempotente — rodar de novo não duplica nada.
 */
export function useGenerateCommitmentInstallments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      commitment: Commitment,
    ): Promise<{ created: number; updated: number; removed: number }> => {
      if (!user) throw new Error("Sessão expirada");
      const { buildSchedule } = await import("@/lib/commitment-schedule");
      const schedule = buildSchedule(commitment, []);
      const empty = { created: 0, updated: 0, removed: 0 };
      if (!schedule) return empty;

      const tag = commitmentTag(commitment.id);
      const { data: existing, error: existingError } = await supabase
        .from("transactions")
        .select("id, due_date, amount, status, installment_number, description")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .ilike("notes", `%${tag}%`);
      if (existingError) throw existingError;

      const rows = existing ?? [];
      const total = schedule.installments.length;
      const paidUntil = commitment.installments_paid ?? 0;

      /** Parcelas que o cronograma atual deve manter em aberto. */
      const wanted = new Map(
        schedule.installments
          .filter((item) => item.number > paidUntil)
          .filter((item) => item.dueDate >= MIN_TRANSACTION_DATE)
          .map((item) => [item.number, item]),
      );

      const seen = new Set<number>();
      const toRemove: string[] = [];
      let updated = 0;

      for (const row of rows) {
        const number = row.installment_number ?? 0;
        const settled = row.status !== "pending";
        const target = wanted.get(number);

        // Parcela já quitada: preserva o histórico sempre.
        if (settled) {
          seen.add(number);
          continue;
        }
        // Duplicada ou fora do cronograma atual: remove a pendente.
        if (!target || seen.has(number)) {
          toRemove.push(row.id);
          continue;
        }
        seen.add(number);

        const sameDate = row.due_date === target.dueDate;
        const sameAmount = Math.abs(Number(row.amount) - target.amount) < 0.005;
        if (!sameDate || !sameAmount) {
          const { error } = await supabase
            .from("transactions")
            .update({
              transaction_date: target.dueDate,
              due_date: target.dueDate,
              amount: target.amount,
              description: `${commitment.name} — parcela ${number}/${total}`,
              total_installments: total,
            })
            .eq("id", row.id);
          if (error) throw error;
          updated += 1;
        }
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", toRemove);
        if (error) throw error;
      }

      const inserts = [...wanted.values()]
        .filter((item) => !seen.has(item.number))
        .map((item) => ({
          user_id: user.id,
          description: `${commitment.name} — parcela ${item.number}/${total}`,
          amount: item.amount,
          transaction_type: "expense" as const,
          category_id: commitment.category_id,
          account_id: commitment.account_id,
          payment_method: commitment.payment_method,
          transaction_date: item.dueDate,
          due_date: item.dueDate,
          status: "pending" as const,
          installment_number: item.number,
          total_installments: total,
          notes: tag,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("transactions").insert(inserts);
        if (error) throw error;
      }

      return { created: inserts.length, updated, removed: toRemove.length };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
