import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileUp,
  Flame,
  Plus,
  TrendingDown,
} from "lucide-react";

import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { GasImportDialog } from "@/components/finance/gas-import-dialog";
import { GasRefillDialog } from "@/components/finance/gas-refill-dialog";
import { GasReminderCard } from "@/components/finance/gas-reminder-card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmblemGauge } from "@/components/ui/panel-emblems";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { axisProps, gridProps, tooltipProps } from "@/lib/chart-theme";
import { formatCurrency, formatDate } from "@/lib/format";
import { durationLabel, summarizeGas, type GasSummary } from "@/lib/gas-analytics";
import { exportGasCsv, exportGasPdf } from "@/lib/gas-export";

import { useGasRefills, type GasRefill } from "@/lib/gas";

export const Route = createFileRoute("/_authenticated/gas")({
  head: () => ({
    meta: [
      { title: "Controle de botijão de gás — GastoCerto" },
      {
        name: "description",
        content:
          "Veja em gráficos quanto tempo o botijão de gás dura, o valor pago em cada troca e a previsão da próxima compra.",
      },
      { property: "og:title", content: "Controle de botijão de gás — GastoCerto" },
      {
        property: "og:description",
        content: "Duração média do botijão, custo por dia e previsão da próxima troca de gás.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GasPage,
});

const DURATION_COLOR = "var(--chart-2)";
const PRICE_COLOR = "var(--chart-4)";

type MetricDetail = {
  label: string;
  value: string;
  hint?: string | undefined;
  description: string;
  rows: [string, string][];
  extra?: ReactNode;
  chartData?: any[];
  chartKey?: string;
  chartColor?: string;
};


/** Card de indicador clicável — abre o detalhamento completo do número. */
function MetricCard({
  label,
  value,
  hint,
  onSelect,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <p className="mt-2 text-[11px] text-muted-foreground/80">Toque para ver os detalhes</p>
    </button>
  );
}

function MetricDetailDialog({
  detail,
  onClose,
}: {
  detail: MetricDetail | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(detail)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        {detail ? (
          <>
            <DialogHeader>
              <DialogTitle>{detail.label}</DialogTitle>
              <DialogDescription>{detail.description}</DialogDescription>
            </DialogHeader>
            <p className="font-display text-3xl font-semibold tabular-nums">{detail.value}</p>
            {detail.hint ? (
              <p className="-mt-2 text-sm text-muted-foreground">{detail.hint}</p>
            ) : null}
            <dl className="mt-1 divide-y divide-border rounded-xl border border-border">
              {detail.rows.map(([rowLabel, rowValue]) => (
                <div key={rowLabel} className="flex items-center justify-between gap-3 px-3 py-2">
                  <dt className="text-sm text-muted-foreground">{rowLabel}</dt>
                  <dd className="text-sm font-medium tabular-nums">{rowValue}</dd>
                </div>
              ))}
            </dl>
             {detail.extra}
             {detail.chartData ? (
               <div className="mt-4 h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={detail.chartData}>
                     <CartesianGrid {...gridProps} />
                     <XAxis dataKey="label" {...axisProps} />
                     <Tooltip {...tooltipProps} />
                     <Bar dataKey={detail.chartKey ?? "value"} fill={detail.chartColor ?? "var(--chart-1)"} radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : null}
           </>
         ) : null}

      </DialogContent>
    </Dialog>
  );
}

function buildDetails(summary: GasSummary): Record<string, MetricDetail> {
  const nf = (value: number | null | undefined, suffix = "") =>
    value != null ? `${value.toLocaleString("pt-BR")}${suffix}` : "—";

  const lastCycles = [...summary.closed].slice(-5).reverse();

  return {
    duration: {
      label: "Duração média do botijão",
      value: nf(summary.averageDays, " dias"),
      hint:
        summary.averageDays != null
          ? `~${nf(summary.averageWeeks)} semanas · ~${nf(summary.averageMonths)} mês(es)`
          : "Registre a próxima troca para calcular",
      description: "Intervalo médio entre uma compra e a troca seguinte. Se for curto, você pode estar consumindo muito ou o botijão veio com menos gás.",
      rows: [
        ["Ciclos usados no cálculo", String(summary.closed.length)],
        ["Menor duração", nf(summary.shortestDays, " dias")],
        ["Maior duração", nf(summary.longestDays, " dias")],
      ],
      chartData: summary.closed.map((cycle) => ({
        label: formatDate(cycle.startDate).slice(0, 5),
        dias: cycle.days ?? 0,
      })),
      chartKey: "dias",
      chartColor: DURATION_COLOR,
      extra: lastCycles.length ? (

        <div className="mt-1 space-y-1.5">
          <p className="text-xs uppercase text-muted-foreground">Últimos ciclos encerrados</p>
          {lastCycles.map((cycle) => (
            <div key={cycle.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {formatDate(cycle.startDate)} → {cycle.endDate ? formatDate(cycle.endDate) : "—"}
              </span>
              <span className="font-medium tabular-nums">{cycle.days} dias</span>
            </div>
          ))}
        </div>
      ) : undefined,
    },
    amount: {
      label: "Valor médio por botijão",
      value: formatCurrency(summary.averageAmount),
      hint: `${summary.refillCount} troca(s) registrada(s)`,
      description: "Quanto você paga, em média, em cada troca de gás.",
      rows: [
        ["Total gasto", formatCurrency(summary.totalSpent)],
        ["Trocas registradas", String(summary.refillCount)],
        [
          "Menor valor pago",
          summary.cycles.length
            ? formatCurrency(Math.min(...summary.cycles.map((cycle) => cycle.amount)))
            : "—",
        ],
        [
          "Maior valor pago",
          summary.cycles.length
            ? formatCurrency(Math.max(...summary.cycles.map((cycle) => cycle.amount)))
            : "—",
        ],
      ],
    },
    cost: {
      label: "Custo por dia",
      value: summary.averageCostPerDay != null ? formatCurrency(summary.averageCostPerDay) : "—",
      hint:
        summary.averageMonthlyCost != null
          ? `~${formatCurrency(summary.averageMonthlyCost)} por mês`
          : undefined,
      description: "Valor médio do botijão dividido pela duração média em dias.",
      rows: [
        ["Valor médio", formatCurrency(summary.averageAmount)],
        ["Duração média", nf(summary.averageDays, " dias")],
        [
          "Custo por mês",
          summary.averageMonthlyCost != null ? formatCurrency(summary.averageMonthlyCost) : "—",
        ],
        [
          "Custo por ano",
          summary.averageMonthlyCost != null
            ? formatCurrency(summary.averageMonthlyCost * 12)
            : "—",
        ],
      ],
    },
    next: {
      label: "Próxima troca prevista",
      value: summary.nextRefillDate ? formatDate(summary.nextRefillDate) : "—",
      hint:
        summary.daysUntilNext != null
          ? summary.daysUntilNext >= 0
            ? `Faltam ~${summary.daysUntilNext} dias`
            : `Passou ~${Math.abs(summary.daysUntilNext)} dias da média`
          : undefined,
      description: "Previsão calculada somando a duração média à data da última compra.",
      rows: [
        [
          "Botijão atual comprado em",
          summary.lastRefillDate ? formatDate(summary.lastRefillDate) : "—",
        ],
        ["Em uso há", nf(summary.daysSinceLast, " dias")],
        ["Duração média", nf(summary.averageDays, " dias")],
        ["Dias até a previsão", nf(summary.daysUntilNext, " dias")],
      ],
    },
  };
}

function GasPage() {
  const { data: refills, isLoading } = useGasRefills();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GasRefill | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState("all");

  const summary = useMemo(() => summarizeGas(refills ?? []), [refills]);

  const filteredRefills = useMemo(() => {
    if (!refills) return [];
    if (chartRange === "all") return refills;
    const days = parseInt(chartRange, 10);
    const limit = new Date();
    limit.setDate(limit.getDate() - days);
    return refills.filter(r => new Date(r.refill_date) >= limit);
  }, [refills, chartRange]);


  const filteredSummary = useMemo(() => summarizeGas(filteredRefills), [filteredRefills]);
  const details = useMemo(() => buildDetails(filteredSummary), [filteredSummary]);


  const durationSeries = useMemo(
    () =>
      summary.closed.map((cycle) => ({
        label: formatDate(cycle.startDate).slice(0, 5),
        dias: cycle.days ?? 0,
        periodo: `${formatDate(cycle.startDate)} → ${cycle.endDate ? formatDate(cycle.endDate) : "—"}`,
      })),
    [summary.closed],
  );

  const priceSeries = useMemo(
    () =>
      summary.cycles.map((cycle) => ({
        label: formatDate(cycle.startDate).slice(0, 5),
        valor: cycle.amount,
      })),
    [summary.cycles],
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <EmblemGauge className="size-11" />
          <div>
            <h1 className="font-display text-2xl font-semibold">Controle de botijão de gás</h1>
            <p className="text-sm text-muted-foreground">
              Registre cada troca e acompanhe quanto tempo o gás dura, o valor pago e quando ele
              deve acabar de novo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="size-4" />
            Importar histórico
          </Button>
          <Button
            variant="outline"
            onClick={() => exportGasCsv(summary)}
            disabled={summary.refillCount === 0}
          >
            <FileSpreadsheet className="size-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => void exportGasPdf(summary)}
            disabled={summary.refillCount === 0}
          >
            <FileText className="size-4" />
            PDF
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Registrar troca
          </Button>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <span className="text-sm font-medium">Intervalo do gráfico:</span>
        <div className="flex gap-2">
          {[
            { label: "Todo histórico", value: "all" },
            { label: "30 dias", value: "30" },
            { label: "60 dias", value: "60" },
            { label: "90 dias", value: "90" },
          ].map((range) => (
            <Button
              key={range.value}
              size="sm"
              variant={chartRange === range.value ? "secondary" : "ghost"}
              className="h-8 text-xs"
              onClick={() => setChartRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </section>


      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : summary.refillCount === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Flame className="mx-auto size-8 text-[oklch(0.72_0.17_45)]" aria-hidden />
          <h2 className="mt-3 font-display text-lg font-semibold">Nenhuma troca registrada</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Cadastre a compra do botijão atual. Na próxima troca o sistema já mostra quantos dias o
            gás durou, a média de duração e o custo por dia.
          </p>
          <Button className="mt-4" onClick={openNew}>
            <Plus className="size-4" />
            Registrar primeira troca
          </Button>
        </section>
      ) : (
        <>
          <div className="mt-6">
            <GasReminderCard summary={summary} />
          </div>
          <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["duration", "amount", "cost", "next"] as const).map((key) => (
              <MetricCard
                key={key}
                label={
                  key === "duration"
                    ? "Duração média"
                    : key === "amount"
                      ? "Valor médio por botijão"
                      : key === "cost"
                        ? "Custo por dia"
                        : "Próxima troca prevista"
                }
                value={details[key]!.value}
                hint={details[key]!.hint}
                onSelect={() => setDetailKey(key)}
              />
            ))}
          </section>

          <section className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
            <CalendarClock className="size-4 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Botijão atual comprado em{" "}
              <strong className="text-foreground">
                {summary.lastRefillDate ? formatDate(summary.lastRefillDate) : "—"}
              </strong>
              {summary.daysSinceLast != null ? ` · em uso há ${summary.daysSinceLast} dias` : ""}
            </p>
            {summary.shortestDays != null && summary.longestDays != null ? (
              <Badge variant="secondary">
                Menor: {summary.shortestDays}d · Maior: {summary.longestDays}d
              </Badge>
            ) : null}
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-base font-semibold">
                  Quantos dias cada botijão durou
                </h2>
                {summary.averageDays != null ? (
                  <span className="text-xs text-muted-foreground">
                    média {summary.averageDays.toLocaleString("pt-BR")} dias
                  </span>
                ) : null}
              </div>
              <div className="mt-4 h-64">
                {durationSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={durationSeries} margin={{ top: 18, right: 8, left: -18 }}>
                      <defs>
                        <linearGradient id="gasDuration" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={DURATION_COLOR} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={DURATION_COLOR} stopOpacity={0.45} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                      <YAxis {...axisProps} width={44} unit="d" />
                      <Tooltip
                        {...tooltipProps}
                        formatter={(value: number) => [`${value} dias`, "Duração"]}
                        labelFormatter={(_label, payload) =>
                          (payload?.[0]?.payload as { periodo?: string } | undefined)?.periodo ?? ""
                        }
                      />
                      {summary.averageDays != null ? (
                        <ReferenceLine
                          y={summary.averageDays}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="4 4"
                          label={{
                            value: "média",
                            position: "right",
                            fill: "var(--muted-foreground)",
                            fontSize: 10,
                          }}
                        />
                      ) : null}
                      <Bar
                        dataKey="dias"
                        fill="url(#gasDuration)"
                        radius={[8, 8, 4, 4]}
                        maxBarSize={46}
                      >
                        <LabelList
                          dataKey="dias"
                          position="top"
                          fontSize={10}
                          fill="var(--muted-foreground)"
                        />
                        {durationSeries.map((item, index) => (
                          <Cell
                            key={index}
                            fill="url(#gasDuration)"
                            fillOpacity={
                              summary.averageDays != null && item.dias < summary.averageDays
                                ? 0.6
                                : 1
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    A duração aparece a partir da segunda troca registrada.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                  <TrendingDown className="size-4 text-muted-foreground" aria-hidden />
                  Evolução do preço do botijão
                </h2>
                <span className="text-xs text-muted-foreground">
                  média {formatCurrency(summary.averageAmount)}
                </span>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceSeries} margin={{ top: 18, right: 12, left: -8 }}>
                    <defs>
                      <linearGradient id="gasPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRICE_COLOR} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={PRICE_COLOR} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                    <YAxis
                      {...axisProps}
                      width={56}
                      tickFormatter={(value: number) => `R$ ${Math.round(value)}`}
                    />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(value: number) => [formatCurrency(value), "Valor pago"]}
                    />
                    <ReferenceLine
                      y={summary.averageAmount}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke={PRICE_COLOR}
                      strokeWidth={2.5}
                      fill="url(#gasPrice)"
                      dot={{ r: 3, fill: PRICE_COLOR, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-base font-semibold">Histórico de trocas</h2>
            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compra</TableHead>
                    <TableHead>Acabou em</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Custo/dia</TableHead>
                    <TableHead>Revenda</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...summary.cycles].reverse().map((cycle) => {
                    const row = (refills ?? []).find((item) => item.id === cycle.id) ?? null;
                    return (
                      <TableRow key={cycle.id}>
                        <TableCell>{formatDate(cycle.startDate)}</TableCell>
                        <TableCell>
                          {cycle.endDate ? (
                            formatDate(cycle.endDate)
                          ) : (
                            <Badge variant="secondary">Em uso</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {durationLabel(cycle.days)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(cycle.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cycle.costPerDay != null ? formatCurrency(cycle.costPerDay) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cycle.supplier ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(row);
                              setDialogOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      <MetricDetailDialog
        detail={detailKey ? (details[detailKey] ?? null) : null}
        onClose={() => setDetailKey(null)}
      />
      <GasRefillDialog open={dialogOpen} onOpenChange={setDialogOpen} refill={editing} />
      <GasImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </AppShell>
  );
}
