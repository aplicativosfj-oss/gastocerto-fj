import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lightbulb, TrendingDown, TrendingUp } from "lucide-react";

import {
  CHART_TOKENS,
  axisProps,
  barRadius,
  gridProps,
  legendProps,
  tooltipProps,
} from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/format";
import { toCents } from "@/lib/finance";
import { useBalanceTransactions } from "@/lib/closing";
import { useCategories } from "@/lib/queries";
import { buildTips, categoryTrends, monthlySeries, weekdaySpending } from "@/lib/insights";

type InsightsPanelProps = {
  /** Competência exibida no painel. */
  year: number;
  month: number;
};

const TONE_STYLE: Record<string, string> = {
  good: "border-emerald-500/40 bg-emerald-500/5",
  warn: "border-amber-500/40 bg-amber-500/5",
  bad: "border-destructive/40 bg-destructive/5",
  info: "border-border bg-muted/40",
};

/** Gráficos de tendência e dicas automáticas baseadas no histórico do usuário. */
export function InsightsPanel({ year, month }: InsightsPanelProps) {
  const { data: history, isLoading } = useBalanceTransactions();
  const { data: categories } = useCategories();

  const reference = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const previousKey = useMemo(() => {
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }, [year, month]);

  const rows = history ?? [];

  const nameOf = (id: string | null) =>
    (categories ?? []).find((category) => category.id === id)?.name ?? "Sem categoria";

  const series = useMemo(() => {
    const today = new Date();
    const isCurrent = year === today.getFullYear() && month === today.getMonth() + 1;
    return monthlySeries(rows, 6, isCurrent ? today : reference);
  }, [rows, reference, year, month]);

  const trends = useMemo(
    () => categoryTrends(rows, monthKey, previousKey, nameOf).slice(0, 6),
    [rows, monthKey, previousKey, categories],
  );

  const weekdays = useMemo(() => weekdaySpending(rows, monthKey), [rows, monthKey]);

  const essentials = useMemo(() => {
    let essential = 0;
    let nonEssential = 0;
    rows.forEach((row) => {
      if (row.transaction_type !== "expense" || row.status === "canceled") return;
      if (row.transaction_date.slice(0, 7) !== monthKey) return;
      if (row.is_essential) essential += Number(row.amount);
      else nonEssential += Number(row.amount);
    });
    return { essential: toCents(essential), nonEssential: toCents(nonEssential) };
  }, [rows, monthKey]);

  const tips = useMemo(() => {
    const today = new Date();
    const isCurrent = year === today.getFullYear() && month === today.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    return buildTips({
      series,
      trends,
      essential: essentials.essential,
      nonEssential: essentials.nonEssential,
      dayOfMonth: isCurrent ? today.getDate() : daysInMonth,
      daysInMonth,
      currency: formatCurrency,
    });
  }, [series, trends, essentials, year, month]);

  if (isLoading) return null;

  const trendData = trends.map((trend) => ({
    name: trend.name,
    variacao: trend.delta,
    percent: trend.percent,
    current: trend.current,
  }));

  const pct = (value: number, total: number) =>
    total > 0 ? `${Math.round((value / total) * 100)}%` : "—";

  /** Média do percentual que sobra nos meses com receita. */
  const monthsWithIncome = series.filter((point) => point.income > 0);
  const averageSavings = monthsWithIncome.length
    ? Math.round(
        monthsWithIncome.reduce((sum, point) => sum + point.savingsRate, 0) / monthsWithIncome.length,
      )
    : 0;

  const totalIncome = series.reduce((sum, point) => sum + point.income, 0);
  const totalExpense = series.reduce((sum, point) => sum + point.expense, 0);
  const weekdayTotal = weekdays.reduce((sum, point) => sum + point.gasto, 0);
  const topWeekday = weekdays.reduce(
    (best, point) => (point.gasto > best.gasto ? point : best),
    weekdays[0] ?? { label: "—", gasto: 0, count: 0 },
  );
  const monthExpense = essentials.essential + essentials.nonEssential;


  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Evolução dos últimos 6 meses</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Receitas e despesas mês a mês para você enxergar a tendência do seu caixa.
          </p>
          <div className="chart-frame mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={44} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(value: number, name, item) => {
                    const point = item?.payload as (typeof series)[number] | undefined;
                    const base = point?.income ?? 0;
                    const share = name === "Despesas" ? ` · ${pct(value, base)} da receita` : "";
                    return [`${formatCurrency(value)}${share}`, name as string];
                  }}
                />
                <Legend {...legendProps} />
                <Bar dataKey="income" name="Receitas" fill={CHART_TOKENS.income} radius={barRadius} />
                <Bar dataKey="expense" name="Despesas" fill={CHART_TOKENS.expense} radius={barRadius} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            No período, as despesas representam{" "}
            <span className="font-medium text-foreground">{pct(totalExpense, totalIncome)}</span> das
            receitas acumuladas.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Quanto sobra por mês</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Percentual da receita que ficou livre depois de todas as despesas (meta saudável: 20%).
          </p>
          <div className="chart-frame mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={40} unit="%" />
                <Tooltip
                  {...tooltipProps}
                  formatter={(value: number, name, item) => {
                    const point = item?.payload as (typeof series)[number] | undefined;
                    return [
                      `${value}% (${formatCurrency(point?.result ?? 0)})`,
                      name as string,
                    ];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="savingsRate"
                  name="Sobra"
                  stroke={CHART_TOKENS.neutral}
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Média do período:{" "}
            <span className="font-medium text-foreground">{averageSavings}%</span> da receita sobrando
            por mês.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Variação por categoria</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Diferença entre este mês e o anterior: barras à direita indicam aumento de gasto.
          </p>
          <div className="chart-frame mt-2">
            {trendData.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Ainda não há dois meses de histórico para comparar.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} layout="vertical">
                  <CartesianGrid {...gridProps} />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                  <Tooltip
                    {...tooltipProps}
                    formatter={(value: number, name, item) => {
                      const point = item?.payload as (typeof trendData)[number] | undefined;
                      const percent =
                        point?.percent == null
                          ? "novo gasto"
                          : `${point.percent > 0 ? "+" : ""}${point.percent}%`;
                      return [`${formatCurrency(value)} · ${percent}`, name as string];
                    }}
                  />
                  <Bar dataKey="variacao" name="Variação" radius={barRadius}>
                    {trendData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.variacao >= 0 ? CHART_TOKENS.expense : CHART_TOKENS.income}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {trendData.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {trendData.slice(0, 4).map((entry) => (
                <li key={entry.name}>
                  {entry.name}:{" "}
                  <span
                    className={
                      entry.variacao >= 0 ? "font-medium text-destructive" : "font-medium text-income"
                    }
                  >
                    {entry.percent == null
                      ? "novo"
                      : `${entry.percent > 0 ? "+" : ""}${entry.percent}%`}
                  </span>{" "}
                  · {pct(entry.current, monthExpense)} do mês
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Gastos por dia da semana</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mostra em que dias você gasta mais — útil para planejar compras e lazer.
          </p>
          <div className="chart-frame mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdays}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={44} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(value: number, name) => [
                    `${formatCurrency(value)} · ${pct(value, weekdayTotal)} do mês`,
                    name as string,
                  ]}
                />
                <Bar dataKey="gasto" name="Gasto" fill={CHART_TOKENS.neutral} radius={barRadius} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Dia mais pesado:{" "}
            <span className="font-medium text-foreground">
              {topWeekday.label} ({pct(topWeekday.gasto, weekdayTotal)})
            </span>{" "}
            · essenciais {pct(essentials.essential, monthExpense)} · não essenciais{" "}
            {pct(essentials.nonEssential, monthExpense)}
          </p>
        </div>
      </div>


      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-primary" />
          Dicas profissionais para o seu mês
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Geradas automaticamente a partir dos seus próprios lançamentos, sempre que os dados mudam.
        </p>

        {tips.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Registre alguns lançamentos para receber orientações personalizadas.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {tips.map((tip) => (
              <li key={tip.id} className={`rounded-xl border p-3 ${TONE_STYLE[tip.tone]}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {tip.tone === "good" ? (
                    <TrendingDown className="size-4 text-income" />
                  ) : (
                    <TrendingUp className="size-4 text-amber-600" />
                  )}
                  {tip.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{tip.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
