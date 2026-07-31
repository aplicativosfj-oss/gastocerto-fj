import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { isoDate, MONTH_NAMES, monthRange } from "@/lib/finance";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  useDeleteNotification,
  useMarkNotifications,
  useNotificationPreferences,
  useNotifications,
  useSaveNotificationPreferences,
  useSyncNotifications,
  type NotificationDraft,
} from "@/lib/notifications";
import { useCategories } from "@/lib/queries";
import { useBudgets, useTransactions } from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário e lembretes — GastoCerto" },
      {
        name: "description",
        content: "Veja vencimentos, recorrências e alertas de orçamento em um calendário mensal.",
      },
      { property: "og:title", content: "Calendário e lembretes — GastoCerto" },
      {
        property: "og:description",
        content: "Veja vencimentos, recorrências e alertas de orçamento em um calendário mensal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(isoDate(today));

  const range = useMemo(() => monthRange(year, month), [year, month]);
  const { data: transactions, isLoading } = useTransactions(range);
  const { data: budgets } = useBudgets(year, month);
  const { data: categories } = useCategories();
  const { data: notifications } = useNotifications();
  const { data: preferences } = useNotificationPreferences();
  const savePreferences = useSaveNotificationPreferences();
  const markNotifications = useMarkNotifications();
  const deleteNotification = useDeleteNotification();
  const syncNotifications = useSyncNotifications();

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) map.set(category.id, category.name);
    return map;
  }, [categories]);

  /** Agrupa lançamentos por data-alvo (vencimento quando existir). */
  const byDay = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const item of transactions ?? []) {
      const key = item.due_date ?? item.transaction_date;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [transactions]);

  const budgetAlerts = useMemo(() => {
    const spentByCategory = new Map<string, number>();
    for (const item of transactions ?? []) {
      if (item.transaction_type !== "expense" || !item.category_id) continue;
      spentByCategory.set(
        item.category_id,
        (spentByCategory.get(item.category_id) ?? 0) + Number(item.amount || 0),
      );
    }
    return (budgets ?? [])
      .map((budget) => {
        const limit = Number(budget.limit_amount || 0);
        const spent = budget.category_id ? (spentByCategory.get(budget.category_id) ?? 0) : 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        return {
          id: budget.id,
          name: budget.category_id
            ? (categoryName.get(budget.category_id) ?? "Categoria")
            : "Orçamento geral",
          limit,
          spent,
          percent,
          threshold: budget.alert_percentage ?? 80,
        };
      })
      .filter((item) => item.limit > 0 && item.percent >= item.threshold)
      .sort((a, b) => b.percent - a.percent);
  }, [budgets, transactions, categoryName]);

  const alertsEnabled = preferences?.budget_alerts ?? true;
  const dueEnabled = preferences?.due_alerts ?? true;

  // Gera lembretes do período aberto e grava apenas os inéditos (dedupe_key).
  useEffect(() => {
    if (!transactions) return;
    const drafts: NotificationDraft[] = [];
    const todayIso = isoDate(new Date());

    if (dueEnabled) {
      for (const item of transactions) {
        const due = item.due_date;
        if (!due || item.status === "paid" || item.status === "received") continue;
        const diff = daysBetween(todayIso, due);
        if (diff > 3 || diff < -365) continue;
        const overdue = diff < 0;
        drafts.push({
          notification_type: overdue ? "overdue" : "due_soon",
          title: overdue ? "Conta atrasada" : "Vencimento próximo",
          message: `${item.description} — ${formatCurrency(Number(item.amount || 0))} em ${formatDate(`${due}T00:00:00`)}`,
          severity: overdue ? "critical" : "warning",
          link: "/lancamentos",
          reference_id: item.id,
          reference_date: due,
          dedupe_key: `${overdue ? "overdue" : "due"}:${item.id}:${due}`,
        });
      }
    }

    if (alertsEnabled) {
      for (const alert of budgetAlerts) {
        drafts.push({
          notification_type: "budget",
          title: alert.percent >= 100 ? "Orçamento estourado" : "Orçamento próximo do limite",
          message: `${alert.name}: ${formatCurrency(alert.spent)} de ${formatCurrency(alert.limit)} (${alert.percent.toFixed(0)}%)`,
          severity: alert.percent >= 100 ? "critical" : "warning",
          link: "/orcamentos",
          reference_id: alert.id,
          reference_date: range.start,
          dedupe_key: `budget:${alert.id}:${year}-${month}:${alert.percent >= 100 ? "over" : "near"}`,
        });
      }
    }

    if (drafts.length === 0) return;
    syncNotifications.mutate(drafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, budgetAlerts, alertsEnabled, dueEnabled]);

  const unread = (notifications ?? []).filter((item) => !item.read_at);
  const selectedItems = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  const cells = useMemo(() => buildCells(year, month), [year, month]);

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
    setSelectedDay(null);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Calendário</h1>
            <p className="text-sm text-muted-foreground">
              Vencimentos, recorrências e alertas de orçamento em um só lugar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-40 text-center text-sm font-medium">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-border bg-card p-4">
            {isLoading ? (
              <Skeleton className="h-96" />
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                  {WEEKDAYS.map((day) => (
                    <span key={day} className="py-1">
                      {day}
                    </span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {cells.map((cell, index) => {
                    if (!cell) return <div key={`empty-${index}`} className="min-h-20" />;
                    const items = byDay.get(cell) ?? [];
                    const total = items.reduce(
                      (sum, item) =>
                        sum + (item.transaction_type === "expense" ? Number(item.amount || 0) : 0),
                      0,
                    );
                    const hasOverdue = items.some(
                      (item) =>
                        item.due_date &&
                        item.status !== "paid" &&
                        item.status !== "received" &&
                        item.due_date < isoDate(new Date()),
                    );
                    const isToday = cell === isoDate(new Date());
                    return (
                      <button
                        key={cell}
                        type="button"
                        onClick={() => setSelectedDay(cell)}
                        className={[
                          "min-h-20 rounded-lg border p-1.5 text-left text-xs transition-colors",
                          selectedDay === cell
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-secondary/60",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-flex size-5 items-center justify-center rounded-full text-[11px]",
                            isToday ? "bg-primary text-primary-foreground" : "",
                          ].join(" ")}
                        >
                          {Number(cell.slice(8, 10))}
                        </span>
                        {items.length > 0 ? (
                          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                            {items.length} item(s)
                          </span>
                        ) : null}
                        {total > 0 ? (
                          <span
                            className={[
                              "mt-0.5 block truncate text-[11px] font-medium",
                              hasOverdue ? "text-destructive" : "text-foreground",
                            ].join(" ")}
                          >
                            {formatCurrency(total)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {selectedDay ? (
              <div className="mt-4 border-t border-border pt-4">
                <h2 className="text-sm font-medium">
                  {formatDate(`${selectedDay}T00:00:00`)} · {selectedItems.length} lançamento(s)
                </h2>
                <ul className="mt-2 space-y-2">
                  {selectedItems.length === 0 ? (
                    <li className="text-sm text-muted-foreground">Nada agendado para este dia.</li>
                  ) : (
                    selectedItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{item.description}</span>
                        <span
                          className={
                            item.transaction_type === "income"
                              ? "shrink-0 font-medium text-primary"
                              : "shrink-0 font-medium"
                          }
                        >
                          {formatCurrency(Number(item.amount || 0))}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="size-4" />
                  Notificações
                  {unread.length > 0 ? <Badge variant="secondary">{unread.length}</Badge> : null}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={unread.length === 0 || markNotifications.isPending}
                  onClick={() => markNotifications.mutate({ all: true })}
                >
                  {markNotifications.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </Button>
              </div>

              <ul className="mt-3 space-y-2">
                {(notifications ?? []).length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    Nenhum lembrete no momento. Cadastre vencimentos para receber alertas.
                  </li>
                ) : (
                  (notifications ?? []).slice(0, 12).map((item) => (
                    <li
                      key={item.id}
                      className={[
                        "rounded-lg border p-3 text-sm",
                        item.read_at ? "border-border opacity-70" : "border-primary/40 bg-primary/5",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {!item.read_at ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              aria-label="Marcar como lida"
                              onClick={() => markNotifications.mutate({ ids: [item.id] })}
                            >
                              <Check className="size-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive"
                            aria-label="Remover"
                            onClick={() => deleteNotification.mutate(item.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="size-4" />
                Preferências de alerta
              </h2>
              <div className="mt-3 space-y-3">
                <PreferenceRow
                  id="pref-due"
                  label="Lembretes de vencimento"
                  description="Avisos até 3 dias antes e para contas atrasadas."
                  checked={dueEnabled}
                  onChange={(checked) => {
                    savePreferences.mutate(
                      { due_alerts: checked },
                      { onError: () => toast.error("Não foi possível salvar a preferência") },
                    );
                  }}
                />
                <PreferenceRow
                  id="pref-budget"
                  label="Alertas de orçamento"
                  description="Avisa ao atingir o percentual definido em cada orçamento."
                  checked={alertsEnabled}
                  onChange={(checked) => {
                    savePreferences.mutate(
                      { budget_alerts: checked },
                      { onError: () => toast.error("Não foi possível salvar a preferência") },
                    );
                  }}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function PreferenceRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function buildCells(year: number, month: number): Array<string | null> {
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(isoDate(new Date(year, month - 1, day)));
  }
  return cells;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
