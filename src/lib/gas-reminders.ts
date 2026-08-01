/**
 * Lembretes da troca do botijão de gás, a partir da previsão de duração.
 */

import type { NotificationDraft } from "@/lib/notifications";
import type { GasSummary } from "@/lib/gas-analytics";

export type GasReminder = {
  dedupeKey: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  date: string;
  daysAway: number;
};

/**
 * Gera o lembrete correspondente à situação atual do botijão:
 * - faltando até `daysBefore` dias → aviso para já ir se organizando;
 * - passou da previsão → alerta de que o gás pode acabar a qualquer momento.
 */
export function buildGasReminders(
  summary: GasSummary,
  options: { daysBefore?: number } = {},
): GasReminder[] {
  const daysBefore = options.daysBefore ?? 7;
  if (!summary.nextRefillDate || summary.daysUntilNext == null) return [];

  const date = summary.nextRefillDate;
  const daysAway = summary.daysUntilNext;

  if (daysAway < 0) {
    return [
      {
        dedupeKey: `gas:overdue:${date}`,
        title: "O botijão de gás já passou da média",
        message: `Pela sua média, o gás deveria ter acabado em ${date.split("-").reverse().join("/")}. Já se passaram ${Math.abs(daysAway)} dia(s) — vale deixar um botijão de reserva.`,
        severity: "warning",
        date,
        daysAway,
      },
    ];
  }

  if (daysAway <= daysBefore) {
    return [
      {
        dedupeKey: `gas:due:${date}`,
        title: daysAway === 0 ? "O gás deve acabar hoje" : `Troque o gás em ~${daysAway} dia(s)`,
        message: `Previsão da próxima troca: ${date.split("-").reverse().join("/")}. Programe a compra do botijão para não ficar sem gás.`,
        severity: daysAway <= 2 ? "warning" : "info",
        date,
        daysAway,
      },
    ];
  }

  return [];
}

export function gasReminderDrafts(reminders: GasReminder[]): NotificationDraft[] {
  return reminders.map((reminder) => ({
    notification_type: "gas_refill",
    title: reminder.title,
    message: reminder.message,
    severity: reminder.severity,
    link: "/gas",
    reference_date: reminder.date,
    dedupe_key: reminder.dedupeKey,
  }));
}
