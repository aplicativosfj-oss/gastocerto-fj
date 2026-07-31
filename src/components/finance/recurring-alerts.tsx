import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, CalendarClock, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useMarkNotifications,
  useNotificationPreferences,
  useNotifications,
  useSyncNotifications,
} from "@/lib/notifications";
import { occurrencesFor, useRecurringRules } from "@/lib/recurring";
import { useEffect } from "react";

type Upcoming = {
  id: string;
  dedupeKey: string;
  description: string;
  amount: number;
  date: string;
  daysAway: number;
};

/**
 * Painel de alertas dos próximos lançamentos gerados por recorrências.
 * A antecedência segue a preferência do usuário (dias antes do vencimento) e
 * cada alerta pode ser marcado como resolvido — some da lista sem apagar o histórico.
 */
export function RecurringAlerts({ days }: { days?: number }) {
  const { data: rules } = useRecurringRules();
  const { data: preferences } = useNotificationPreferences();
  const { data: notifications } = useNotifications();
  const sync = useSyncNotifications();
  const mark = useMarkNotifications();

  const window = days ?? preferences?.days_before_due ?? 7;
  const alertsEnabled = preferences?.due_alerts ?? true;

  const upcoming = useMemo<Upcoming[]>(() => {
    if (!rules) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + window);

    const list: Upcoming[] = [];
    rules
      .filter((rule) => rule.active)
      .forEach((rule) => {
        occurrencesFor(rule, horizon).forEach((date) => {
          const when = new Date(`${date}T00:00:00`);
          if (when < today) return;
          list.push({
            id: `${rule.id}-${date}`,
            dedupeKey: `recurring:${rule.id}:${date}`,
            description: rule.description,
            amount: Number(rule.amount),
            date,
            daysAway: Math.round((when.getTime() - today.getTime()) / 86_400_000),
          });
        });
      });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [rules, window]);

  const byKey = useMemo(() => {
    const map = new Map<string, { id: string; read: boolean }>();
    (notifications ?? []).forEach((item) => {
      if (item.dedupe_key) map.set(item.dedupe_key, { id: item.id, read: Boolean(item.read_at) });
    });
    return map;
  }, [notifications]);

  /** Persiste os alertas para que fiquem disponíveis também no calendário. */
  useEffect(() => {
    if (!alertsEnabled || upcoming.length === 0 || !notifications) return;
    const drafts = upcoming
      .filter((item) => !byKey.has(item.dedupeKey))
      .slice(0, 20)
      .map((item) => ({
        notification_type: "recurring_due",
        title: `Recorrência: ${item.description}`,
        message: `${formatCurrency(item.amount)} previsto para ${formatDate(item.date)}.`,
        severity: item.daysAway <= 1 ? ("warning" as const) : ("info" as const),
        link: "/recorrencia",
        reference_date: item.date,
        dedupe_key: item.dedupeKey,
      }));
    if (drafts.length > 0) sync.mutate(drafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming, notifications, alertsEnabled]);

  const pending = upcoming.filter((item) => !byKey.get(item.dedupeKey)?.read).slice(0, 6);
  const resolvedCount = upcoming.length - upcoming.filter((item) => !byKey.get(item.dedupeKey)?.read).length;

  if (!alertsEnabled || pending.length === 0) return null;

  const total = pending.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="size-4 text-[oklch(0.75_0.15_75)]" />
          Próximos lançamentos automáticos
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {pending.length} em {window} dias · {formatCurrency(total)}
        </Badge>
      </div>

      <ul className="mt-3 space-y-2">
        {pending.map((item) => {
          const notificationId = byKey.get(item.dedupeKey)?.id;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-2 text-xs"
            >
              <span className="flex items-center gap-2">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{item.description}</span>
                <span className="text-muted-foreground">
                  {item.daysAway === 0
                    ? "hoje"
                    : item.daysAway === 1
                      ? "amanhã"
                      : `em ${item.daysAway} dias`}{" "}
                  · {formatDate(item.date)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!notificationId || mark.isPending}
                  onClick={() => notificationId && mark.mutate({ ids: [notificationId] })}
                  aria-label={`Marcar ${item.description} como resolvido`}
                >
                  <Check className="size-3.5" />
                  Resolvido
                </Button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8">
          <Link to="/recorrencia">Gerenciar recorrências</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8">
          <Link to="/calendario">Configurar alertas</Link>
        </Button>
        {resolvedCount > 0 ? (
          <span className="text-xs text-muted-foreground">{resolvedCount} já resolvido(s)</span>
        ) : null}
      </div>
    </section>
  );
}
