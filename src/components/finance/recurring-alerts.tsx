import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { occurrencesFor, useRecurringRules } from "@/lib/recurring";

type Upcoming = {
  id: string;
  description: string;
  amount: number;
  date: string;
  daysAway: number;
};

/**
 * Alertas dos próximos lançamentos que serão gerados pelas recorrências,
 * exibidos antes das datas de vencimento.
 */
export function RecurringAlerts({ days = 7 }: { days?: number }) {
  const { data: rules } = useRecurringRules();

  const upcoming = useMemo<Upcoming[]>(() => {
    if (!rules) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + days);

    const list: Upcoming[] = [];
    rules
      .filter((rule) => rule.active)
      .forEach((rule) => {
        occurrencesFor(rule, horizon).forEach((date) => {
          const when = new Date(`${date}T00:00:00`);
          if (when < today) return;
          list.push({
            id: `${rule.id}-${date}`,
            description: rule.description,
            amount: Number(rule.amount),
            date,
            daysAway: Math.round((when.getTime() - today.getTime()) / 86_400_000),
          });
        });
      });

    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [rules, days]);

  if (upcoming.length === 0) return null;

  const total = upcoming.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="size-4 text-[oklch(0.75_0.15_75)]" />
          Próximos lançamentos automáticos
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {upcoming.length} em {days} dias · {formatCurrency(total)}
        </Badge>
      </div>

      <ul className="mt-3 space-y-2">
        {upcoming.map((item) => (
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
            <span className="font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
          </li>
        ))}
      </ul>

      <Button asChild variant="ghost" size="sm" className="mt-2 h-8">
        <Link to="/recorrentes">Gerenciar recorrências</Link>
      </Button>
    </section>
  );
}
