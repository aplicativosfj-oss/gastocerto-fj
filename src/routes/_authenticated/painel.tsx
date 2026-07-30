import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { PeriodPicker } from "@/components/finance/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { MONTH_NAMES, isoDate, monthRange, periodDefaultDate } from "@/lib/finance";
import { useCategories, useProfile } from "@/lib/queries";
import { useBudgets, useTransactions } from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — GastoCerto" },
      { name: "description", content: "Resumo dos seus gastos e receitas no GastoCerto." },
      { property: "og:title", content: "Painel — GastoCerto" },
      { property: "og:description", content: "Resumo dos seus gastos e receitas no GastoCerto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: profile, isLoading } = useProfile();
  const { data: categories } = useCategories();
  const range = monthRange(period.year, period.month);
  const { data: transactions, isLoading: loadingTransactions } = useTransactions(range);
  const { data: budgets } = useBudgets(period.year, period.month);

  const previous = new Date(period.year, period.month - 2, 1);
  const previousRange = monthRange(previous.getFullYear(), previous.getMonth() + 1);
  const { data: previousTransactions } = useTransactions(previousRange);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, profile, navigate]);

  const metrics = useMemo(() => {
    const rows = transactions ?? [];
    const expenses = rows.filter((row) => row.transaction_type === "expense");
    const incomes = rows.filter((row) => row.transaction_type === "income");
    const sum = (items: typeof rows) => items.reduce((total, row) => total + Number(row.amount), 0);

    const todayIso = isoDate(today);
    const weekStart = isoDate(new Date(today.getTime() - 6 * 86_400_000));

    const totalExpense = sum(expenses);
    const totalIncome = sum(incomes);
    const generalBudget = (budgets ?? []).find((budget) => !budget.category_id);
    const limit = generalBudget ? Number(generalBudget.limit_amount) : 0;
    const previousExpense = (previousTransactions ?? [])
      .filter((row) => row.transaction_type === "expense")
      .reduce((total, row) => total + Number(row.amount), 0);

    const isCurrentMonth =
      period.year === today.getFullYear() && period.month === today.getMonth() + 1;
    const elapsedDays = isCurrentMonth ? today.getDate() : range.days;
    const dailyAverage = elapsedDays > 0 ? totalExpense / elapsedDays : 0;

    return {
      today: sum(expenses.filter((row) => row.transaction_date === todayIso)),
      week: sum(expenses.filter((row) => row.transaction_date >= weekStart)),
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      limit,
      available: limit > 0 ? limit - totalExpense : 0,
      usedPercent: limit > 0 ? Math.min(999, (totalExpense / limit) * 100) : 0,
      upcoming: rows.filter((row) => row.status === "pending" || row.status === "overdue"),
      recurring: sum(expenses.filter((row) => row.is_recurring)),
      dailyAverage,
      projection: dailyAverage * range.days,
      previousExpense,
      diffPercent:
        previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense) * 100 : 0,
      expenses,
      incomes,
    };
  }, [transactions, previousTransactions, budgets, period, range.days, today]);

  const byDay = useMemo(() => {
    const map = new Map<number, { day: number; gasto: number; receita: number }>();
    for (let day = 1; day <= range.days; day += 1) map.set(day, { day, gasto: 0, receita: 0 });
    for (const row of transactions ?? []) {
      const day = Number(row.transaction_date.slice(8, 10));
      const entry = map.get(day);
      if (!entry) continue;
      if (row.transaction_type === "income") entry.receita += Number(row.amount);
      else entry.gasto += Number(row.amount);
    }
    return [...map.values()];
  }, [transactions, range.days]);

  const byCategory = useMemo(() => {
    const names = new Map((categories ?? []).map((category) => [category.id, category]));
    const totals = new Map<string, { name: string; value: number; color: string }>();
    for (const row of metrics.expenses) {
      const category = row.category_id ? names.get(row.category_id) : undefined;
      const key = category?.id ?? "sem-categoria";
      const current = totals.get(key) ?? {
        name: category?.name ?? "Sem categoria",
        value: 0,
        color: category?.color ?? "#94a3b8",
      };
      current.value += Number(row.amount);
      totals.set(key, current);
    }
    return [...totals.values()].sort((a, b) => b.value - a.value);
  }, [metrics.expenses, categories]);

  const essentialSplit = useMemo(() => {
    const essential = metrics.expenses
      .filter((row) => row.is_essential)
      .reduce((total, row) => total + Number(row.amount), 0);
    return [
      { name: "Essenciais", value: essential, color: "#10b981" },
      { name: "Não essenciais", value: metrics.totalExpense - essential, color: "#f97316" },
    ];
  }, [metrics.expenses, metrics.totalExpense]);

  const budgetAlerts = useMemo(() => {
    const names = new Map((categories ?? []).map((category) => [category.id, category.name]));
    return (budgets ?? [])
      .filter((budget) => budget.category_id && Number(budget.limit_amount) > 0)
      .map((budget) => {
        const spent = metrics.expenses
          .filter((row) => row.category_id === budget.category_id)
          .reduce((total, row) => total + Number(row.amount), 0);
        const percent = (spent / Number(budget.limit_amount)) * 100;
        return {
          id: budget.id,
          name: names.get(budget.category_id!) ?? "Categoria",
          percent,
          spent,
          limit: Number(budget.limit_amount),
          alertAt: budget.alert_percentage,
        };
      })
      .filter((item) => item.percent >= item.alertAt)
      .sort((a, b) => b.percent - a.percent);
  }, [budgets, metrics.expenses, categories]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "por aqui";

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              Olá, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {MONTH_NAMES[period.month - 1]} de {period.year}
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <PeriodPicker year={period.year} month={period.month} onChange={setPeriod} />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Adicionar gasto
            </Button>
          </div>
        </header>

        {loadingTransactions ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Gasto hoje" value={formatCurrency(metrics.today)} icon={<TrendingDown className="size-4 text-destructive" />} />
              <StatCard label="Gasto nos 7 dias" value={formatCurrency(metrics.week)} />
              <StatCard label="Gasto no mês" value={formatCurrency(metrics.totalExpense)} />
              <StatCard label="Recebido no mês" value={formatCurrency(metrics.totalIncome)} icon={<TrendingUp className="size-4 text-primary" />} />
              <StatCard
                label="Saldo do mês"
                value={formatCurrency(metrics.balance)}
                icon={<Wallet className="size-4 text-primary" />}
                hint={metrics.balance >= 0 ? "Positivo" : "Negativo"}
              />
              <StatCard label="Média diária" value={formatCurrency(metrics.dailyAverage)} />
              <StatCard
                label="Projeção do mês"
                value={formatCurrency(metrics.projection)}
                hint="Com base no ritmo atual"
              />
              <StatCard
                label="Comparado ao mês anterior"
                value={
                  metrics.previousExpense > 0
                    ? `${metrics.diffPercent >= 0 ? "+" : ""}${metrics.diffPercent.toFixed(1)}%`
                    : "—"
                }
                hint={formatCurrency(metrics.previousExpense)}
              />
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Orçamento do mês</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/orcamentos">
                    Gerenciar
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>
              {metrics.limit > 0 ? (
                <div className="mt-4 space-y-2">
                  <Progress value={Math.min(100, metrics.usedPercent)} />
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      Utilizado: <strong className="text-foreground">{formatCurrency(metrics.totalExpense)}</strong> de{" "}
                      {formatCurrency(metrics.limit)}
                    </span>
                    <span>
                      Disponível:{" "}
                      <strong className="text-foreground">{formatCurrency(metrics.available)}</strong> (
                      {metrics.usedPercent.toFixed(0)}% consumido)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Você ainda não definiu um orçamento mensal.{" "}
                  <Link to="/orcamentos" className="font-medium text-primary underline">
                    Definir agora
                  </Link>
                </p>
              )}
            </section>

            {budgetAlerts.length > 0 ? (
              <section className="space-y-2">
                {budgetAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[oklch(0.75_0.15_75)]" />
                    <p>
                      Você já utilizou <strong>{alert.percent.toFixed(0)}%</strong> do orçamento de{" "}
                      <strong>{alert.name}</strong> ({formatCurrency(alert.spent)} de{" "}
                      {formatCurrency(alert.limit)}).
                    </p>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Gastos por dia"
                summary={`Maior gasto diário: ${formatCurrency(Math.max(0, ...byDay.map((item) => item.gasto)))}.`}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="gasto" name="Gasto" fill="oklch(0.55 0.18 260)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Gastos por categoria"
                summary={
                  byCategory.length > 0
                    ? `Maior categoria: ${byCategory[0].name} com ${formatCurrency(byCategory[0].value)}.`
                    : "Sem gastos categorizados neste período."
                }
              >
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                      {byCategory.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Receitas x despesas"
                summary={`Receitas ${formatCurrency(metrics.totalIncome)} contra despesas ${formatCurrency(metrics.totalExpense)}.`}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="receita" name="Receitas" stroke="#10b981" dot={false} />
                    <Line type="monotone" dataKey="gasto" name="Despesas" stroke="#f43f5e" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Essenciais x não essenciais"
                summary={`Essenciais representam ${
                  metrics.totalExpense > 0
                    ? ((essentialSplit[0].value / metrics.totalExpense) * 100).toFixed(0)
                    : 0
                }% dos gastos.`}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={essentialSplit} dataKey="value" nameKey="name" outerRadius={90}>
                      {essentialSplit.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">Últimos lançamentos</h2>
                {(transactions ?? []).length === 0 ? (
                  <EmptyState onAdd={() => setDialogOpen(true)} />
                ) : (
                  <ul className="mt-4 space-y-3">
                    {(transactions ?? []).slice(0, 6).map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">{row.description}</span>
                        <span
                          className={
                            row.transaction_type === "income"
                              ? "shrink-0 font-semibold tabular-nums text-primary"
                              : "shrink-0 font-semibold tabular-nums"
                          }
                        >
                          {row.transaction_type === "income" ? "+" : "−"}
                          {formatCurrency(Number(row.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="ghost" size="sm" className="mt-4">
                  <Link to="/lancamentos">
                    Ver todas
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">Próximas contas</h2>
                {metrics.upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhuma conta pendente neste período.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {metrics.upcoming.slice(0, 6).map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{row.description}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge variant={row.status === "overdue" ? "destructive" : "secondary"}>
                            {row.status === "overdue" ? "Atrasado" : "Pendente"}
                          </Badge>
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(Number(row.amount))}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Gastos recorrentes previstos: {formatCurrency(metrics.recurring)}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Maiores categorias</h2>
              {byCategory.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nada registrado ainda.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {byCategory.slice(0, 5).map((item) => (
                    <li key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{item.name}</span>
                        <span className="tabular-nums">{formatCurrency(item.value)}</span>
                      </div>
                      <Progress
                        value={metrics.totalExpense > 0 ? (item.value / metrics.totalExpense) * 100 : 0}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind="expense"
        defaultDate={periodDefaultDate(period.year, period.month)}
        onSaved={(savedDate) => {
          const [y, m] = savedDate.split("-").map(Number);
          if (y && m && (y !== period.year || m !== period.month)) setPeriod({ year: y, month: m });
        }}
      />
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-3 text-xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">Nenhum lançamento neste período.</p>
      <Button className="mt-3" size="sm" onClick={onAdd}>
        <Plus className="mr-2 size-4" />
        Registrar o primeiro
      </Button>
    </div>
  );
}
