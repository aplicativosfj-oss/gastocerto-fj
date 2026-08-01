import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Car,
  Landmark,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,

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
import { ExpenseCardsDialog } from "@/components/finance/expense-cards-dialog";
import { DependentExpenseDialog } from "@/components/finance/dependent-expense-dialog";
import { TaxQuickDialog } from "@/components/finance/tax-quick-dialog";
import { RecurringAlerts } from "@/components/finance/recurring-alerts";
import { MetricDetailDialog, type MetricDetail as BaseMetricDetail } from "@/components/finance/metric-detail-dialog";

interface MetricDetail extends BaseMetricDetail {
  onAction?: () => void;
}
import { QuickCategoryMenu, type QuickPick } from "@/components/finance/quick-category-menu";
import { PeriodPicker } from "@/components/finance/period-picker";
import { CardMonthSummary } from "@/components/finance/card-month-summary";
import { InsightsPanel } from "@/components/finance/insights-panel";
import { PastMonthsLockNotice } from "@/components/finance/past-months-lock-notice";
import { VehicleEmblem } from "@/components/finance/vehicle-emblem";
import { usePeriodStore } from "@/lib/period-store";
import { InteractiveCalendar } from "@/components/finance/interactive-calendar";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHART_TOKENS,
  axisProps,
  barRadius,
  gridProps,
  legendProps,
  seriesColor,
  tooltipProps,
} from "@/lib/chart-theme";
import { formatCurrency, formatDate } from "@/lib/format";
import { MONTH_NAMES, isoDate, monthRange, periodDefaultDate } from "@/lib/finance";
import { useCategories, useProfile } from "@/lib/queries";
import { useBudgets, useTransactions, type Transaction } from "@/lib/transactions";
import { useAutoRecurring } from "@/lib/recurring";
import { useVehicles, VEHICLE_TYPES } from "@/lib/vehicles";
import { vehicleSpendBreakdown } from "@/lib/vehicle-spend";
import { labelFor } from "@/lib/finance";


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
  const { year: storedYear, month: storedMonth, setPeriod: setStoredPeriod, reset } = usePeriodStore();
  const [period, setPeriod] = useState({ year: storedYear, month: storedMonth });

  const handlePeriodChange = (next: { year: number; month: number }) => {
    setPeriod(next);
    setStoredPeriod(next);
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<"expense" | "income">("expense");
  const [preset, setPreset] = useState<QuickPick>({ categoryId: null, subCategoryId: null });
  const [detail, setDetail] = useState<MetricDetail | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [dependentOpen, setDependentOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);

  const { data: profile, isLoading } = useProfile();
  const { data: categories } = useCategories();
  const { data: vehicles } = useVehicles();
  const range = monthRange(period.year, period.month);
  const { data: transactions, isLoading: loadingTransactions } = useTransactions(range);
  const { data: budgets } = useBudgets(period.year, period.month);

  // Contabiliza automaticamente as contas recorrentes do período.
  useAutoRecurring();


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
    const previousMonthExpenses = (previousTransactions ?? []).filter(
      (row) => row.transaction_type === "expense",
    );
    const previousExpense = previousMonthExpenses.reduce(
      (total, row) => total + Number(row.amount),
      0,
    );

    const isCurrentMonth =
      period.year === today.getFullYear() && period.month === today.getMonth() + 1;
    const elapsedDays = isCurrentMonth ? today.getDate() : range.days;
    const dailyAverage = elapsedDays > 0 ? totalExpense / elapsedDays : 0;

    return {
      isCurrentMonth,
      /** Só soma quando o período aberto é o mês corrente, evitando misturar competências. */
      today: isCurrentMonth
        ? sum(expenses.filter((row) => row.transaction_date === todayIso))
        : 0,
      /**
       * Últimos 7 dias corridos (inclui hoje), restrito ao mês aberto: cada mês
       * enxerga apenas os próprios gastos, sem misturar competências.
       */
      week: isCurrentMonth
        ? sum(
            expenses.filter(
              (row) =>
                row.transaction_date >= weekStart &&
                row.transaction_date >= range.start &&
                row.transaction_date <= todayIso,
            ),
          )
        : 0,


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
      /** Só compara quando os dois períodos têm gasto e o mês não é futuro. */
      diffAvailable:
        previousExpense > 0 &&
        totalExpense > 0 &&
        new Date(period.year, period.month - 1, 1) <=
          new Date(today.getFullYear(), today.getMonth(), 1),
      diffPercent:
        previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense) * 100 : 0,
      expenses,
      incomes,
    };
  }, [transactions, previousTransactions, budgets, period, range.days, today]);

  /** Listas usadas no detalhamento ao clicar em cada card. */
  const detailRows = useMemo(() => {
    const rows = transactions ?? [];
    const expenses = rows.filter((row) => row.transaction_type === "expense");
    const todayIso = isoDate(today);
    const weekStart = isoDate(new Date(today.getTime() - 6 * 86_400_000));
    const sameMonth =
      period.year === today.getFullYear() && period.month === today.getMonth() + 1;
    return {
      all: rows,
      expenses,
      incomes: rows.filter((row) => row.transaction_type === "income"),
      todayExpenses: sameMonth
        ? expenses.filter((row) => row.transaction_date === todayIso)
        : [],
      weekExpenses: sameMonth
        ? [
            ...expenses,
            ...(previousTransactions ?? []).filter((row) => row.transaction_type === "expense"),
          ]
            .filter((row) => row.transaction_date >= weekStart && row.transaction_date <= todayIso)
            .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
        : [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, previousTransactions, period.year, period.month]);


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
    const totals = new Map<string, { id: string; name: string; value: number; color: string }>();
    for (const row of metrics.expenses) {
      const category = row.category_id ? names.get(row.category_id) : undefined;
      const key = category?.id ?? "sem-categoria";
      const current = totals.get(key) ?? {
        id: key,
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
      { name: "Essenciais", value: essential, color: CHART_TOKENS.income },
      { name: "Não essenciais", value: metrics.totalExpense - essential, color: CHART_TOKENS.warning },
    ];
  }, [metrics.expenses, metrics.totalExpense]);

  /** Detalhamento profissional ao clicar em qualquer ponto dos gráficos. */
  const openCategoryDetail = (categoryId: string, name: string) => {
    const rows = metrics.expenses.filter((row) =>
      categoryId === "sem-categoria" ? !row.category_id : row.category_id === categoryId,
    );
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    
    // Calcula o total faturado no mês para esta categoria (mesmo que o card principal seja filtrado)
    // No caso de "Gás", o usuário quer ver o que foi gasto "neste mês"
    setDetail({
      label: `Gastos em ${name}`,
      value: formatCurrency(total),
      totalInvoiced: formatCurrency(total),
      hint: `${rows.length} lançamento(s) em ${MONTH_NAMES[period.month - 1]} de ${period.year}`,
      formula: "Soma das despesas do período classificadas nesta categoria.",

      rows,
      extra: [
        {
          label: "Participação nas despesas",
          value:
            metrics.totalExpense > 0
              ? `${((total / metrics.totalExpense) * 100).toFixed(1)}%`
              : "—",
        },
        {
          label: "Ticket médio",
          value: rows.length > 0 ? formatCurrency(total / rows.length) : "—",
        },
      ],
    });
  };

  const openDayDetail = (day: number) => {
    const iso = `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const rows = (transactions ?? []).filter((row) => row.transaction_date === iso);
    const expense = rows
      .filter((row) => row.transaction_type === "expense")
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const income = rows
      .filter((row) => row.transaction_type === "income")
      .reduce((sum, row) => sum + Number(row.amount), 0);
      
    setDetail({
      label: `Movimentos de ${formatDate(iso)}`,
      value: formatCurrency(expense),
      hint: `${rows.length} lançamento(s) no dia`,
      formula: "Soma das movimentações financeiras registradas nesta data específica.",
      rows,
      extra: [
        { label: "Total Receitas", value: formatCurrency(income) },
        { label: "Total Despesas", value: formatCurrency(expense) },
        { label: "Resultado do dia", value: formatCurrency(income - expense) }
      ],
      onAction: () => {
        // Redireciona para lançamentos já filtrado por este dia
        navigate({
          to: "/lancamentos",
          search: { 
            ano: period.year, 
            mes: period.month, 
            tipo: "all"
          } as any
        });
      }
    });
  };

  const openEssentialDetail = (essential: boolean) => {
    const rows = metrics.expenses.filter((row) => Boolean(row.is_essential) === essential);
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    setDetail({
      label: essential ? "Gastos essenciais" : "Gastos não essenciais",
      value: formatCurrency(total),
      hint: `${rows.length} lançamento(s)`,
      formula: essential
        ? "Despesas marcadas como essenciais no período."
        : "Despesas não marcadas como essenciais no período.",
      rows,
    });
  };

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

  const vehicleSummary = useMemo(
    () => vehicleSpendBreakdown(transactions ?? [], vehicles ?? [], categories ?? []),
    [transactions, vehicles, categories],
  );
  const vehicleTotal = vehicleSummary.reduce((sum, row) => sum + row.total, 0);


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
      <div className="space-y-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="page-title truncate">
              Olá, {firstName}!
            </h1>
            <p className="page-subtitle mt-1">
              {MONTH_NAMES[period.month - 1]} de {period.year} · Clique nos dias do calendário ou nas categorias para detalhes profissionais
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                reset();
                navigate({
                  search: {
                    ano: new Date().getFullYear(),
                    mes: new Date().getMonth() + 1,
                  } as any,
                  replace: true,
                });
              }}
              title="Voltar para hoje e limpar filtros"
            >
              <RefreshCw className="mr-1.5 size-3" />
              Redefinir
            </Button>
            <PeriodPicker year={period.year} month={period.month} onChange={handlePeriodChange} />
            <QuickCategoryMenu
              kind="income"
              label="Nova receita"
              onPick={(pick) => {
                setEditingTx(null);
                setDialogKind("income");
                setPreset(pick);
                setDialogOpen(true);
              }}
            />
            <Button onClick={() => setCardsOpen(true)}>
              <Zap className="mr-2 size-4" aria-hidden />
              Gasto em 2 toques
            </Button>
            <QuickCategoryMenu
              kind="expense"
              label="Novo gasto"
              onPick={(pick) => {
                setEditingTx(null);
                setDialogKind("expense");
                setPreset(pick);
                setDialogOpen(true);
              }}
            />
            <Button onClick={() => navigate({ to: "/veiculos" })}>
              <Car className="mr-2 size-4" />
              Novo gasto do veículo
            </Button>
            <Button variant="outline" onClick={() => setDependentOpen(true)}>
              <Users className="mr-2 size-4" aria-hidden />
              Gasto com filhos
            </Button>
            <Button variant="outline" onClick={() => setTaxOpen(true)}>
              <Landmark className="mr-2 size-4" aria-hidden />
              Imposto de Renda
            </Button>
          </div>

        </header>

        {loadingTransactions ? (
          <div className="grid gap-3 auto-cards-sm opacity-50 transition-opacity duration-300">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <InteractiveCalendar onDayClick={openDayDetail} />
              
              <div className="grid gap-3 auto-cards-sm">
                <StatCard
                  tile="var(--acc-4)"
                  label={
                    metrics.isCurrentMonth
                      ? `Gasto hoje · ${formatDate(isoDate(today))}`
                      : "Gasto hoje"
                  }
                  value={formatCurrency(metrics.today)}
                  hint={
                    !metrics.isCurrentMonth
                      ? "Disponível apenas no mês atual"
                      : detailRows.todayExpenses.length === 0
                        ? "Nenhum lançamento hoje"
                        : `${detailRows.todayExpenses.length} lançamento${
                            detailRows.todayExpenses.length > 1 ? "s" : ""
                          } só de hoje`
                  }
                  icon={<Zap className="size-4" />}
                  onClick={() => openDayDetail(today.getDate())}
                />

                <StatCard
                  tile="var(--acc-3)"
                  label="Gasto nos 7 dias"
                  value={formatCurrency(metrics.week)}
                  icon={<CalendarClock className="size-4" />}
                  onClick={() =>
                    setDetail({
                      label: "Gasto nos últimos 7 dias",
                      value: formatCurrency(metrics.week),
                      formula:
                        "Soma das despesas dos 7 dias corridos até hoje, incluindo os dias que caem no mês anterior.",
                      rows: detailRows.weekExpenses,
                    })
                  }
                />
                
                <StatCard
                  tile="var(--acc-5)"
                  label="Gasto no mês"
                  value={formatCurrency(metrics.totalExpense)}
                  icon={<TrendingDown className="size-4" />}
                  onClick={() =>
                    setDetail({
                      label: "Gasto no mês",
                      value: formatCurrency(metrics.totalExpense),
                      formula: "Soma de todas as despesas do período selecionado.",
                      rows: detailRows.expenses,
                      extra: [
                        { label: "Lançamentos", value: String(detailRows.expenses.length) },
                        { label: "Média diária", value: formatCurrency(metrics.dailyAverage) },
                      ],
                    })
                  }
                />

                <StatCard
                  tile="var(--acc-2)"
                  label="Receita total"
                  value={formatCurrency(metrics.totalIncome)}
                  icon={<TrendingUp className="size-4" />}
                  onClick={() =>
                    setDetail({
                      label: "Receita total",
                      value: formatCurrency(metrics.totalIncome),
                      formula: "Soma de todas as receitas do período selecionado.",
                      rows: detailRows.incomes,
                      extra: [
                        { label: "Lançamentos", value: String(detailRows.incomes.length) },
                      ],
                    })
                  }
                />

                <StatCard
                  tile="var(--acc-1)"
                  label="Saldo disponível"
                  value={formatCurrency(metrics.balance)}
                  icon={<Wallet className="size-4" />}
                />
              </div>
            </div>

            <div className="space-y-4">
              {metrics.limit > 0 && (
                <StatCard
                  tile="var(--acc-6)"
                  label="Orçamento geral"
                  value={formatCurrency(metrics.limit)}
                  progress={metrics.usedPercent}
                  icon={<Wallet className="size-4" />}
                  hint={`Você já usou ${metrics.usedPercent.toFixed(1)}% do seu limite definido.`}
                />
              )}
              
              <RecurringAlerts />
            </div>
          </div>
        )}

        {/* Bloco de métricas secundárias */}
        {!loadingTransactions && (
          <div className="grid gap-3 auto-cards-sm mt-4">
            <StatCard
              tile="var(--acc-1)"
              label="Média diária"
              value={formatCurrency(metrics.dailyAverage)}
              onClick={() =>
                setDetail({
                  label: "Média diária de gastos",
                  value: formatCurrency(metrics.dailyAverage),
                  formula: "Gasto do mês dividido pelos dias já decorridos do período.",
                  rows: detailRows.expenses,
                  extra: [
                    { label: "Gasto no mês", value: formatCurrency(metrics.totalExpense) },
                    { label: "Projeção do mês", value: formatCurrency(metrics.projection) },
                  ],
                })
              }
            />
            <StatCard
              tile="var(--acc-6)"
              label="Projeção do mês"
              value={formatCurrency(metrics.projection)}
              hint="Com base no ritmo atual"
              onClick={() =>
                setDetail({
                  label: "Projeção do mês",
                  value: formatCurrency(metrics.projection),
                  formula: "Média diária multiplicada pelo total de dias do mês.",
                  rows: detailRows.expenses,
                  extra: [
                    { label: "Média diária", value: formatCurrency(metrics.dailyAverage) },
                    { label: "Gasto até agora", value: formatCurrency(metrics.totalExpense) },
                  ],
                })
              }
            />
          </div>
        )}
        
        {!loadingTransactions && (
          <div className="space-y-4 mt-4">


            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Orçamento do mês</h2>
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

            <PastMonthsLockNotice
              monthKey={`${period.year}-${String(period.month).padStart(2, "0")}`}
            />

            <RecurringAlerts days={7} />

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

            <section className="auto-cards-lg">
              <ChartCard
                title="Gastos por dia"
                summary={`Maior gasto diário: ${formatCurrency(Math.max(0, ...byDay.map((item) => item.gasto)))}. Clique em uma barra para ver o dia.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byDay}
                    onClick={(state: { activeLabel?: string | number }) => {
                      const day = Number(state?.activeLabel);
                      if (day) openDayDetail(day);
                    }}
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip {...tooltipProps} formatter={(value: number) => formatCurrency(value)} />
                    <Bar
                      dataKey="gasto"
                      name="Gasto"
                      fill={CHART_TOKENS.neutral}
                      radius={barRadius}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Gastos por categoria"
                summary={
                  byCategory.length > 0
                    ? `Maior categoria: ${byCategory[0].name} com ${formatCurrency(byCategory[0].value)}. Clique na fatia para detalhar.`
                    : "Sem gastos categorizados neste período."
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={72}
                      className="cursor-pointer"
                      onClick={(entry: { id?: string; name?: string }) => {
                        if (entry?.id) openCategoryDetail(entry.id, entry.name ?? "Categoria");
                      }}
                    >
                      {byCategory.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color ?? seriesColor(index)}
                          stroke="var(--card)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipProps} formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Receitas x despesas"
                summary={`Receitas ${formatCurrency(metrics.totalIncome)} contra despesas ${formatCurrency(metrics.totalExpense)}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={byDay}
                    onClick={(state: { activeLabel?: string | number }) => {
                      const day = Number(state?.activeLabel);
                      if (day) openDayDetail(day);
                    }}
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip {...tooltipProps} formatter={(value: number) => formatCurrency(value)} />
                    <Legend {...legendProps} />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      name="Receitas"
                      stroke={CHART_TOKENS.income}
                      strokeWidth={2}
                      dot={false}
                      className="cursor-pointer"
                    />
                    <Line
                      type="monotone"
                      dataKey="gasto"
                      name="Despesas"
                      stroke={CHART_TOKENS.expense}
                      strokeWidth={2}
                      dot={false}
                      className="cursor-pointer"
                    />
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
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={essentialSplit}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={72}
                      className="cursor-pointer"
                      onClick={(entry: { name?: string }) =>
                        openEssentialDetail(entry?.name === "Essenciais")
                      }
                    >
                      {essentialSplit.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipProps} formatter={(value: number) => formatCurrency(value)} />
                    <Legend {...legendProps} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <InsightsPanel year={period.year} month={period.month} />

            <CardMonthSummary
              transactions={transactions ?? []}
              categories={categories ?? []}
              monthLabel={`${MONTH_NAMES[period.month - 1]}/${period.year}`}

            />

            <section className="auto-cards-lg">
              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Últimos lançamentos</h2>
                {(transactions ?? []).length === 0 ? (
                  <EmptyState onAdd={() => setDialogOpen(true)} />
                ) : (
                  <ul className="mt-3 space-y-2">
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
                  <Link to="/lancamentos" search={() => ({})}>
                    Ver todas
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Próximas contas</h2>
                {metrics.upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhuma conta pendente neste período.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
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

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Maiores categorias</h2>
              {byCategory.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nada registrado ainda.</p>
              ) : (
                <ul className="mt-3 space-y-2">
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

            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Gastos por veículo no período</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/veiculos-relatorio">
                    Relatório completo
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>
              {vehicleSummary.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum gasto vinculado a veículos neste período.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {vehicleSummary.map((row) => (
                    <li key={row.vehicle?.id ?? row.vehicleName} className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <VehicleEmblem
                            vehicleType={row.vehicleType}
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          {row.vehicle ? (
                            <Link
                              to="/lancamentos"
                              search={{
                                veiculo: row.vehicle.id,
                                ano: period.year,
                                mes: period.month,
                              }}
                              className="truncate font-medium underline-offset-4 hover:underline focus-visible:underline"
                              aria-label={`Ver lançamentos de ${row.vehicleName} em ${MONTH_NAMES[period.month - 1]} de ${period.year}`}
                            >
                              {row.vehicleName}
                            </Link>
                          ) : (
                            <span className="truncate font-medium">{row.vehicleName}</span>
                          )}
                          <Badge variant="secondary">
                            {labelFor(VEHICLE_TYPES, row.vehicleType)}
                          </Badge>
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(row.total)}
                        </span>
                      </div>
                      <Progress value={vehicleTotal > 0 ? (row.total / vehicleTotal) * 100 : 0} />
                      <div className="flex flex-wrap gap-1.5">
                        {row.categories.slice(0, 4).map((category) => (
                          <span
                            key={category.id}
                            className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {category.name} · {formatCurrency(category.total)}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      <MetricDetailDialog
        detail={detail}
        categories={categories ?? []}
        onOpenChange={(next) => {
          if (!next) setDetail(null);
        }}
        onEditTransaction={(row) => {
          setDetail(null);
          setEditingTx(row);
          setDialogKind(row.transaction_type === "income" ? "income" : "expense");
          setPreset({ categoryId: null, subCategoryId: null });
          setDialogOpen(true);
        }}
      />

      <DependentExpenseDialog open={dependentOpen} onOpenChange={setDependentOpen} />

      <TaxQuickDialog open={taxOpen} onOpenChange={setTaxOpen} />

      <ExpenseCardsDialog
        open={cardsOpen}
        onOpenChange={setCardsOpen}
        onAdvanced={() => {
          setEditingTx(null);
          setDialogKind("expense");
          setPreset({ categoryId: null, subCategoryId: null });
          setDialogOpen(true);
        }}
      />

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditingTx(null);
        }}
        kind={dialogKind}
        transaction={editingTx}
        presetCategoryId={preset.categoryId}
        presetSubCategoryId={preset.subCategoryId}
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
  progress,
  tile = "var(--acc-1)",
  onClick,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  progress?: number;
  tile?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? `Ver detalhes de ${label}` : undefined}
      className={`accent-tile rounded-2xl p-3 text-left ${
        onClick
          ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
      style={{ "--tile": tile } as React.CSSProperties}
    >
      <div className="flex items-center gap-2" style={{ color: tile }}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums">{value}</p>
      
      {progress !== undefined && (
        <div className="mt-2 space-y-1.5">
          <Progress value={Math.min(100, progress)} className="h-1" />
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            <span>Uso</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {onClick ? (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          toque para detalhar
        </p>
      ) : null}
    </Wrapper>
  );

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
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
      <div className="chart-frame mt-2">{children}</div>
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
