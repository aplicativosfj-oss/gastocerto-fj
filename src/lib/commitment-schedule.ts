import { isoDate, toCents } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NotificationDraft } from "@/lib/notifications";

import type { Commitment, CommitmentEntry } from "@/lib/commitments";

export type InstallmentStatus = "paid" | "overdue" | "due_soon" | "open";

export type ScheduleInstallment = {
  number: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  daysToDue: number;
};

export type CommitmentSchedule = {
  installments: ScheduleInstallment[];
  total: number;
  paidCount: number;
  openCount: number;
  overdueCount: number;
  nextOpen: ScheduleInstallment | null;
  remaining: number;
};

function parseIso(value: string) {
  return new Date(`${value}T12:00:00`);
}

function diffDays(fromIso: string, toIso: string) {
  return Math.round((parseIso(toIso).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}

/** Soma meses preservando o dia (com ajuste para meses curtos). */
export function addMonths(baseIso: string, months: number, dayOfMonth?: number | null) {
  const base = parseIso(baseIso);
  const day = dayOfMonth ?? base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return isoDate(target);
}

/** Data da primeira parcela: usa o próximo vencimento informado ou o dia escolhido. */
export function firstDueDate(commitment: Commitment) {
  if (commitment.next_due_date) return commitment.next_due_date;
  const start = commitment.start_date;
  if (!commitment.due_day) return addMonths(start, 1);
  const candidate = addMonths(start, 0, commitment.due_day);
  return candidate > start ? candidate : addMonths(start, 1, commitment.due_day);
}

/**
 * Parcela pela Tabela Price quando há juros; divisão simples quando não há.
 * `total` e o retorno estão em reais.
 */
export function priceInstallment(total: number, months: number, monthlyRatePercent: number) {
  if (months <= 0) return 0;
  const rate = monthlyRatePercent / 100;
  if (rate <= 0) return toCents(total / months);
  const factor = rate / (1 - Math.pow(1 + rate, -months));
  return toCents(total * factor);
}

/**
 * Monta o carnê automático do compromisso: uma linha por parcela, com
 * vencimento calculado mês a mês e baixa automática pelos pagamentos lançados.
 * Pagamentos com `installment_number` quitam a parcela indicada; os demais são
 * distribuídos na ordem das parcelas em aberto.
 */
export function buildSchedule(
  commitment: Commitment,
  allEntries: CommitmentEntry[],
  options: { daysBefore?: number; reference?: Date } = {},
): CommitmentSchedule | null {
  const count = commitment.installments_total ?? 0;
  if (commitment.is_open_account || count <= 0) return null;

  const daysBefore = options.daysBefore ?? 5;
  const todayIso = isoDate(options.reference ?? new Date());

  const totalAmount = toCents(Number(commitment.total_amount ?? 0));
  const declared = toCents(Number(commitment.installment_amount ?? 0));
  const base = declared > 0 ? declared : toCents(totalAmount / count);

  const entries = allEntries.filter(
    (entry) => entry.commitment_id === commitment.id && entry.entry_type === "payment",
  );

  const targeted = new Map<number, number>();
  let floating = 0;
  for (const entry of entries) {
    const amount = toCents(Number(entry.amount ?? 0));
    if (entry.installment_number && entry.installment_number > 0) {
      targeted.set(
        entry.installment_number,
        toCents((targeted.get(entry.installment_number) ?? 0) + amount),
      );
    } else {
      floating = toCents(floating + amount);
    }
  }

  const first = firstDueDate(commitment);
  const installments: ScheduleInstallment[] = [];

  for (let index = 0; index < count; index += 1) {
    const number = index + 1;
    // A última parcela absorve a diferença de arredondamento.
    const amount =
      declared > 0 || index < count - 1
        ? base
        : toCents(Math.max(totalAmount - base * (count - 1), 0)) || base;

    let paidAmount = targeted.get(number) ?? 0;
    if (paidAmount < amount && floating > 0) {
      const use = Math.min(floating, toCents(amount - paidAmount));
      paidAmount = toCents(paidAmount + use);
      floating = toCents(floating - use);
    }

    const dueDate = addMonths(first, index, commitment.due_day ?? null);
    const daysToDue = diffDays(todayIso, dueDate);
    const paid = paidAmount >= amount - 0.005;
    const status: InstallmentStatus = paid
      ? "paid"
      : daysToDue < 0
        ? "overdue"
        : daysToDue <= daysBefore
          ? "due_soon"
          : "open";

    installments.push({ number, dueDate, amount, paidAmount, status, daysToDue });
  }

  const paidCount = installments.filter((item) => item.status === "paid").length;
  const overdueCount = installments.filter((item) => item.status === "overdue").length;
  const remaining = toCents(
    installments.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0),
  );

  return {
    installments,
    total: toCents(installments.reduce((sum, item) => sum + item.amount, 0)),
    paidCount,
    openCount: installments.length - paidCount,
    overdueCount,
    nextOpen: installments.find((item) => item.status !== "paid") ?? null,
    remaining,
  };
}

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  paid: "Paga",
  overdue: "Atrasada",
  due_soon: "Vence em breve",
  open: "Em aberto",
};

/**
 * Lembretes automáticos das parcelas: avisa os dias antes do vencimento
 * configurados nas preferências e mantém o alerta enquanto estiver atrasada.
 */
export function buildCommitmentReminders(
  commitments: Commitment[],
  entries: CommitmentEntry[],
  options: { daysBefore?: number; reference?: Date } = {},
): NotificationDraft[] {
  const daysBefore = options.daysBefore ?? 5;
  const reference = options.reference ?? new Date();
  const drafts: NotificationDraft[] = [];

  for (const commitment of commitments) {
    if (commitment.status !== "open") continue;
    const schedule = buildSchedule(commitment, entries, { daysBefore, reference });
    if (!schedule) continue;

    for (const item of schedule.installments) {
      if (item.status === "paid" || item.status === "open") continue;
      if (item.daysToDue < -365) continue;
      const overdue = item.status === "overdue";
      drafts.push({
        notification_type: overdue ? "commitment_overdue" : "commitment_due",
        title: overdue ? "Parcela atrasada" : "Parcela a vencer",
        message: `${commitment.name} — parcela ${item.number}/${schedule.installments.length} de ${formatCurrency(item.amount)} ${
          overdue
            ? `venceu em ${formatDate(item.dueDate)} (${Math.abs(item.daysToDue)} dia(s))`
            : `vence em ${formatDate(item.dueDate)} (${item.daysToDue} dia(s))`
        }`,
        severity: overdue ? "critical" : "warning",
        link: "/compromissos",
        reference_id: commitment.id,
        reference_date: item.dueDate,
        dedupe_key: `commitment:${commitment.id}:${item.number}:${item.dueDate}:${overdue ? "late" : "soon"}`,
      });
    }
  }

  return drafts;
}
