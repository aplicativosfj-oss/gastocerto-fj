import { useEffect, useMemo, useRef } from "react";

import { dependentIdFromTags, useSaveDependent, type Dependent } from "@/lib/dependents";
import { isoDate, toCents } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useSyncNotifications, type NotificationDraft } from "@/lib/notifications";
import { useSaveTransaction } from "@/lib/transactions";

export type KidsSummary = {
  income: number;
  expense: number;
  balance: number;
  limit: number | null;
  limitUsed: number;
};

type Txn = { transaction_type: string; amount: number | string; tags: string[] | null; transaction_date: string };

/**
 * Consolida ganhos, gastos e saldo de cada criança no mês, somando a mesada
 * cadastrada aos lançamentos de receita marcados com a tag do dependente.
 */
export function useKidsSummaries(dependents: Dependent[], transactions: Txn[] | undefined) {
  return useMemo(() => {
    const map = new Map<string, KidsSummary>();
    for (const dep of dependents) {
      map.set(dep.id, {
        income: 0,
        expense: 0,
        balance: 0,
        limit: dep.monthly_limit != null ? Number(dep.monthly_limit) : null,
        limitUsed: 0,
      });
    }
    for (const row of transactions ?? []) {
      const id = dependentIdFromTags(row.tags);
      if (!id) continue;
      const entry = map.get(id);
      if (!entry) continue;
      if (row.transaction_type === "income") entry.income = toCents(entry.income + Number(row.amount));
      else if (row.transaction_type === "expense") entry.expense = toCents(entry.expense + Number(row.amount));
    }
    for (const dep of dependents) {
      const entry = map.get(dep.id)!;
      entry.balance = toCents(entry.income - entry.expense);
      entry.limitUsed = entry.limit && entry.limit > 0 ? Math.round((entry.expense / entry.limit) * 100) : 0;
    }
    return map;
  }, [dependents, transactions]);
}

export type KidsAlert = {
  dependentId: string;
  who: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

const LOW_BALANCE_RATIO = 0.2;

/** Alertas do responsável: saldo baixo da mesada e limite de gastos atingido. */
export function useKidsAlerts(dependents: Dependent[], summaries: Map<string, KidsSummary>) {
  return useMemo(() => {
    const alerts: KidsAlert[] = [];
    for (const dep of dependents) {
      const summary = summaries.get(dep.id);
      if (!summary) continue;
      const who = dep.nickname?.trim() || dep.name;
      const allowance = Number(dep.monthly_allowance ?? 0);

      if (summary.limit && summary.limit > 0 && summary.expense >= summary.limit) {
        alerts.push({
          dependentId: dep.id,
          who,
          severity: "critical",
          title: `Limite de gastos de ${who} atingido`,
          message: `${who} já gastou ${formatCurrency(summary.expense)} no mês, ${summary.limitUsed}% do limite de ${formatCurrency(summary.limit)}. Revise os últimos lançamentos antes de liberar novos gastos.`,
        });
      } else if (summary.limit && summary.limit > 0 && summary.expense >= summary.limit * 0.8) {
        alerts.push({
          dependentId: dep.id,
          who,
          severity: "warning",
          title: `${who} está perto do limite`,
          message: `Já foram ${formatCurrency(summary.expense)} de ${formatCurrency(summary.limit)} (${summary.limitUsed}%). Restam ${formatCurrency(toCents(summary.limit - summary.expense))} até o limite definido.`,
        });
      }

      if (allowance > 0 && summary.balance <= allowance * LOW_BALANCE_RATIO) {
        alerts.push({
          dependentId: dep.id,
          who,
          severity: summary.balance <= 0 ? "critical" : "warning",
          title:
            summary.balance <= 0
              ? `Mesada de ${who} zerada`
              : `Saldo da mesada de ${who} está baixo`,
          message: `Saldo atual ${formatCurrency(summary.balance)} — entrou ${formatCurrency(summary.income)} e saiu ${formatCurrency(summary.expense)} no mês (mesada cadastrada: ${formatCurrency(allowance)}).`,
        });
      }
    }
    return alerts;
  }, [dependents, summaries]);
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Grava os alertas do Espaço Kids na central de notificações (1x por mês/tipo). */
export function useKidsAlertSync(alerts: KidsAlert[]) {
  const sync = useSyncNotifications();
  const sent = useRef(new Set<string>());

  useEffect(() => {
    if (alerts.length === 0) return;
    const drafts: NotificationDraft[] = [];
    for (const alert of alerts) {
      const kind = alert.title.includes("imite") ? "limite" : "saldo";
      const key = `kids:${kind}:${alert.dependentId}:${monthKey()}:${alert.severity}`;
      if (sent.current.has(key)) continue;
      sent.current.add(key);
      drafts.push({
        notification_type: "kids",
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        reference_id: alert.dependentId,
        reference_date: isoDate(new Date()),
        dedupe_key: key,
      });
    }
    if (drafts.length > 0) void sync.mutateAsync(drafts).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);
}

/**
 * Recorrência da mesada: no dia configurado, lança automaticamente a mesada do
 * mês como receita da criança e marca o mês para não repetir.
 */
export function useAllowanceRecurrence(
  dependents: Dependent[],
  categoryId: string | null,
  enabled: boolean,
) {
  const save = useSaveTransaction();
  const saveDependent = useSaveDependent();
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !categoryId || dependents.length === 0 || running.current) return;
    const today = new Date();
    const key = monthKey(today);
    const due = dependents.filter((dep) => {
      const day = dep.recurring_allowance_day ? Number(dep.recurring_allowance_day) : null;
      const allowance = Number(dep.monthly_allowance ?? 0);
      return Boolean(day) && allowance > 0 && today.getDate() >= day! && dep.last_allowance_month !== key;
    });
    if (due.length === 0) return;

    running.current = true;
    void (async () => {
      for (const dep of due) {
        const who = dep.nickname?.trim() || dep.name;
        const day = Math.min(Number(dep.recurring_allowance_day), 28);
        const date = isoDate(new Date(today.getFullYear(), today.getMonth(), day));
        try {
          await save.mutateAsync({
            values: {
              description: `${who} — Mesada do mês`,
              amount: Number(dep.monthly_allowance),
              transaction_type: "income",
              category_id: categoryId,
              transaction_date: date,
              status: "received",
              payment_date: date,
              tags: [`dependente:${dep.id}`, "motivo:ganho_mesada", "mesada:automatica"],
              notes: `Mesada mensal automática de ${who}.`,
            },
          });
          await saveDependent.mutateAsync({
            id: dep.id,
            values: { last_allowance_month: key } as Partial<Dependent>,
          });
        } catch {
          // silencioso: meses fechados ou limites de plano não devem travar a tela
        }
      }
      running.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, categoryId, dependents]);
}
