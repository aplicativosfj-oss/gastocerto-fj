/**
 * Análise do botijão de gás — funções puras e testáveis.
 *
 * A partir das datas de troca calculamos a duração de cada botijão (dias,
 * semanas e meses), o custo médio, o custo por dia e a previsão da próxima
 * troca.
 */

export type GasRefillLike = {
  id: string;
  refill_date: string;
  amount: number | string;
  size_kg?: number | string | null;
  supplier?: string | null;
};

export type GasCycle = {
  id: string;
  /** Data em que este botijão foi comprado. */
  startDate: string;
  /** Data da troca seguinte (quando o gás acabou). */
  endDate: string | null;
  /** Dias que o botijão durou (null enquanto for o botijão em uso). */
  days: number | null;
  weeks: number | null;
  months: number | null;
  amount: number;
  costPerDay: number | null;
  supplier: string | null;
};

export type GasSummary = {
  cycles: GasCycle[];
  /** Ciclos já encerrados (com duração conhecida). */
  closed: GasCycle[];
  totalSpent: number;
  averageAmount: number;
  averageDays: number | null;
  averageWeeks: number | null;
  averageMonths: number | null;
  averageCostPerDay: number | null;
  averageMonthlyCost: number | null;
  shortestDays: number | null;
  longestDays: number | null;
  lastRefillDate: string | null;
  /** Dias desde a última troca. */
  daysSinceLast: number | null;
  /** Previsão da próxima troca, com base na média de duração. */
  nextRefillDate: string | null;
  daysUntilNext: number | null;
  refillCount: number;
};

const DAY = 86_400_000;

function toDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function daysBetween(startIso: string, endIso: string) {
  return Math.round((toDate(endIso).getTime() - toDate(startIso).getTime()) / DAY);
}

export function addDaysIso(iso: string, days: number) {
  const date = toDate(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monta o resumo completo a partir dos registros de troca de gás. */
export function summarizeGas(
  refills: GasRefillLike[],
  reference: Date = new Date(),
): GasSummary {
  const sorted = [...refills]
    .filter((item) => Boolean(item.refill_date))
    .sort((a, b) => a.refill_date.localeCompare(b.refill_date));

  const cycles: GasCycle[] = sorted.map((item, index) => {
    const next = sorted[index + 1] ?? null;
    const amount = Number(item.amount ?? 0);
    const days = next ? daysBetween(item.refill_date, next.refill_date) : null;
    return {
      id: item.id,
      startDate: item.refill_date.slice(0, 10),
      endDate: next ? next.refill_date.slice(0, 10) : null,
      days,
      weeks: days != null ? round(days / 7, 1) : null,
      months: days != null ? round(days / 30.44, 1) : null,
      amount,
      costPerDay: days && days > 0 ? round(amount / days, 2) : null,
      supplier: item.supplier ?? null,
    };
  });

  const closed = cycles.filter((cycle) => cycle.days != null && cycle.days > 0);
  const totalSpent = round(cycles.reduce((sum, cycle) => sum + cycle.amount, 0));
  const averageAmount = cycles.length ? round(totalSpent / cycles.length) : 0;

  const averageDays = closed.length
    ? round(closed.reduce((sum, cycle) => sum + (cycle.days ?? 0), 0) / closed.length, 1)
    : null;

  const averageCostPerDay =
    averageDays && averageDays > 0 ? round(averageAmount / averageDays, 2) : null;

  const lastRefillDate = sorted.length ? sorted[sorted.length - 1]!.refill_date.slice(0, 10) : null;
  const todayIso = reference.toISOString().slice(0, 10);
  const daysSinceLast = lastRefillDate ? daysBetween(lastRefillDate, todayIso) : null;

  const nextRefillDate =
    lastRefillDate && averageDays ? addDaysIso(lastRefillDate, Math.round(averageDays)) : null;
  const daysUntilNext = nextRefillDate ? daysBetween(todayIso, nextRefillDate) : null;

  const durations = closed.map((cycle) => cycle.days ?? 0);

  return {
    cycles,
    closed,
    totalSpent,
    averageAmount,
    averageDays,
    averageWeeks: averageDays != null ? round(averageDays / 7, 1) : null,
    averageMonths: averageDays != null ? round(averageDays / 30.44, 1) : null,
    averageCostPerDay,
    averageMonthlyCost:
      averageCostPerDay != null ? round(averageCostPerDay * 30.44, 2) : null,
    shortestDays: durations.length ? Math.min(...durations) : null,
    longestDays: durations.length ? Math.max(...durations) : null,
    lastRefillDate,
    daysSinceLast,
    nextRefillDate,
    daysUntilNext,
    refillCount: cycles.length,
  };
}

/** Texto amigável para a duração: "58 dias (~8,3 semanas · ~1,9 mês)". */
export function durationLabel(days: number | null | undefined) {
  if (days == null) return "Em uso";
  const weeks = round(days / 7, 1).toLocaleString("pt-BR");
  const months = round(days / 30.44, 1).toLocaleString("pt-BR");
  return `${days} dias · ~${weeks} sem · ~${months} mês(es)`;
}
