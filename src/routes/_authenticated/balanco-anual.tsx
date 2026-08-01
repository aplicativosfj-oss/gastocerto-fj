import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, FileDown, FileSpreadsheet, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmblemReceipt } from "@/components/ui/panel-emblems";
import { axisProps, seriesColor, tooltipProps } from "@/lib/chart-theme";
import {
  buildAnnualBalance,
  exportAnnualBalanceCsv,
  exportAnnualBalancePdf,
} from "@/lib/annual-balance";
import { BALANCE_START, buildBalance, useBalanceTransactions, useClosings } from "@/lib/closing";
import { MONTH_NAMES } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useCategories, useProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/balanco-anual")({
  head: () => ({
    meta: [
      { title: "Balanço anual | GastoCerto" },
      {
        name: "description",
        content:
          "Balanço geral do ano com entradas, saídas, resultado por mês e por categoria, com exportação em PDF e CSV.",
      },
      { property: "og:title", content: "Balanço anual | GastoCerto" },
      {
        property: "og:description",
        content: "Consolide o ano inteiro: entradas, saídas, resultado e categorias campeãs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnnualBalancePage,
});

function AnnualBalancePage() {
  const { data: transactions, isLoading } = useBalanceTransactions();
  const { data: closings } = useClosings();
  const { data: categories } = useCategories();
  const { data: profile } = useProfile();

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let year = BALANCE_START.year; year <= current; year += 1) list.push(year);
    return list.reverse();
  }, []);
  const [year, setYear] = useState(() => String(years[0] ?? BALANCE_START.year));

  const balance = useMemo(() => {
    const rows = buildBalance(transactions ?? [], closings ?? []);
    const nameOf = (id: string | null) =>
      (categories ?? []).find((category) => category.id === id)?.name ?? "Sem categoria";
    return buildAnnualBalance(Number(year), rows, transactions ?? [], nameOf);
  }, [transactions, closings, categories, year]);

  const chartData = balance.months.map((row) => ({
    mes: (MONTH_NAMES[row.month - 1] ?? "").slice(0, 3),
    entradas: row.income,
    saidas: row.expense,
    resultado: row.result,
  }));

  const positive = balance.result >= 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <EmblemReceipt className="size-11 shrink-0" />
            <div>
              <h1 className="page-title">Balanço geral do ano</h1>
              <p className="page-subtitle mt-1">
                Fechamento consolidado de entradas, saídas e resultado — mês a mês e por categoria.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[130px]">
                <CalendarRange className="mr-2 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                exportAnnualBalanceCsv(balance);
                toast.success("CSV do balanço anual gerado.");
              }}
            >
              <FileSpreadsheet className="size-4" />
              CSV
            </Button>
            <Button
              onClick={async () => {
                try {
                  await exportAnnualBalancePdf(balance, profile?.full_name ?? undefined);
                  toast.success("PDF do balanço anual gerado.");
                } catch {
                  toast.error("Não foi possível gerar o PDF agora.");
                }
              }}
            >
              <FileDown className="size-4" />
              Baixar PDF
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Entradas no ano" value={balance.income} tone="income" />
              <SummaryCard label="Saídas no ano" value={balance.expense} tone="expense" />
              <SummaryCard
                label="Resultado do ano"
                value={balance.result}
                tone={positive ? "income" : "expense"}
                hint={`Taxa de poupança ${balance.savingsRate.toFixed(1).replace(".", ",")}%`}
              />
              <SummaryCard
                label="Saldo final"
                value={balance.closing}
                tone="neutral"
                hint={`Saldo inicial ${formatCurrency(balance.opening)}`}
              />
            </div>

            <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-display text-[14px] font-bold tracking-tight sm:text-[15px]">
                  Entradas x saídas por mês
                </h2>
                <p className="text-[11px] text-muted-foreground sm:text-[12px]">
                  Valores em milhares de reais (mil = R$ 1.000)
                </p>
              </div>
              <div className="mt-2.5 h-56 sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 6, right: 6, left: -6, bottom: 0 }} barGap={2} barCategoryGap="22%">
                    <CartesianGrid {...gridProps} opacity={0.5} />
                    <XAxis
                      dataKey="mes"
                      {...axisProps}
                      tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                      interval={0}
                      tickMargin={6}
                      minTickGap={0}
                    />
                    <YAxis
                      {...axisProps}
                      tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                      width={46}
                      tickMargin={4}
                      tickFormatter={compactAxisValue}
                    />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(value: number, name) => [formatCurrency(Number(value)), String(name)]}
                    />
                    <Legend {...legendProps} />
                    <Bar dataKey="entradas" name="Entradas" fill={CHART_TOKENS.income} radius={barRadius} maxBarSize={26} />
                    <Bar dataKey="saidas" name="Saídas" fill={CHART_TOKENS.expense} radius={barRadius} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {balance.bestMonth ? (
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="size-3" /> Melhor mês: {balance.bestMonth.label} (
                    {formatCurrency(balance.bestMonth.result)})
                  </Badge>
                ) : null}
                {balance.worstMonth ? (
                  <Badge variant="secondary" className="gap-1">
                    <TrendingDown className="size-3" /> Mês mais apertado: {balance.worstMonth.label} (
                    {formatCurrency(balance.worstMonth.result)})
                  </Badge>
                ) : null}
                <Badge variant="outline">
                  Média mensal de saídas: {formatCurrency(balance.monthlyAverageExpense)}
                </Badge>
                <Badge variant="outline">{balance.count} lançamentos no ano</Badge>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Saldo final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balance.months.map((row) => (
                      <TableRow key={`${row.year}-${row.month}`}>
                        <TableCell className="font-medium">
                          {MONTH_NAMES[row.month - 1]}
                          {row.closed ? (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Fechado
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.income)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.expense)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${row.result >= 0 ? "text-emerald-500" : "text-destructive"}`}
                        >
                          {formatCurrency(row.result)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.closing)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">% do ano</TableHead>
                      <TableHead className="text-right">Lanç.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balance.categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          Nenhuma despesa registrada em {balance.year}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      balance.categories.slice(0, 15).map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(row.total)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.share.toFixed(1).replace(".", ",")}%
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "neutral";
  hint?: string;
}) {
  const toneClass =
    tone === "income" ? "text-emerald-500" : tone === "expense" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {formatCurrency(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
