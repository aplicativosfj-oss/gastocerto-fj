import { useEffect, useMemo } from "react";
import { BellRing, Check, Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { buildGasReminders, gasReminderDrafts } from "@/lib/gas-reminders";
import type { GasSummary } from "@/lib/gas-analytics";
import {
  useMarkNotifications,
  useNotificationPreferences,
  useNotifications,
  useSyncNotifications,
} from "@/lib/notifications";

/**
 * Lembrete de troca do botijão baseado na previsão de duração.
 * Persiste a notificação (sem duplicar) para aparecer também no sino do app.
 */
export function GasReminderCard({ summary }: { summary: GasSummary }) {
  const { data: preferences } = useNotificationPreferences();
  const { data: notifications } = useNotifications();
  const sync = useSyncNotifications();
  const mark = useMarkNotifications();

  const enabled = preferences?.gas_alerts ?? true;
  const daysBefore = preferences?.days_before_due ?? 7;

  const reminders = useMemo(
    () => (enabled ? buildGasReminders(summary, { daysBefore }) : []),
    [enabled, summary, daysBefore],
  );

  const byKey = useMemo(() => {
    const map = new Map<string, { id: string; read: boolean }>();
    (notifications ?? []).forEach((item) => {
      if (item.dedupe_key) map.set(item.dedupe_key, { id: item.id, read: Boolean(item.read_at) });
    });
    return map;
  }, [notifications]);

  useEffect(() => {
    if (!enabled || reminders.length === 0 || !notifications) return;
    const pending = reminders.filter((reminder) => !byKey.has(reminder.dedupeKey));
    if (pending.length === 0) return;
    sync.mutate(gasReminderDrafts(pending));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reminders, notifications]);

  const visible = reminders.filter((reminder) => !byKey.get(reminder.dedupeKey)?.read);

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Os lembretes do botijão estão desativados nas suas preferências de notificação.
      </section>
    );
  }

  if (visible.length === 0) {
    return (
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
        <BellRing className="size-4 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Lembretes ativos.{" "}
          {summary.nextRefillDate
            ? `Vamos te avisar quando a troca prevista para ${formatDate(summary.nextRefillDate)} estiver chegando.`
            : "Registre a próxima troca para o sistema calcular a previsão."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[oklch(0.72_0.17_45/0.4)] bg-[oklch(0.72_0.17_45/0.07)] p-4">
      <header className="flex items-center gap-2">
        <Flame className="size-4 text-[oklch(0.62_0.17_45)]" aria-hidden />
        <h2 className="font-display text-base font-semibold">Lembrete de troca do gás</h2>
      </header>
      <ul className="mt-3 space-y-2">
        {visible.map((reminder) => {
          const entry = byKey.get(reminder.dedupeKey);
          return (
            <li
              key={reminder.dedupeKey}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-card/70 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{reminder.title}</p>
                <p className="text-xs text-muted-foreground">{reminder.message}</p>
              </div>
              <Badge variant={reminder.severity === "info" ? "secondary" : "destructive"}>
                {reminder.daysAway < 0
                  ? `${Math.abs(reminder.daysAway)}d atrasado`
                  : `em ${reminder.daysAway}d`}
              </Badge>
              {entry ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => mark.mutate({ ids: [entry.id] })}
                  disabled={mark.isPending}
                >
                  <Check className="size-4" />
                  Já troquei
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
