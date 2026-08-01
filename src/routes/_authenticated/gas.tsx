import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Flame, Plus, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { GasRefillDialog } from "@/components/finance/gas-refill-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { axisProps, gridProps, seriesColor, tooltipProps, barRadius } from "@/lib/chart-theme";
import { formatCurrency, formatDate } from "@/lib/format";
import { durationLabel, summarizeGas } from "@/lib/gas-analytics";
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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function GasPage() {
  const { data: refills, isLoading } = useGasRefills();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GasRefill | null>(null);

  const summary = useMemo(() => summarizeGas(refills ?? []), [refills]);

  const durationSeries = useMemo(
    () =>
      summary.closed.map((cycle) => ({
        label: formatDate(cycle.startDate),
        dias: cycle.days ?? 0,
      })),
    [summary.closed],
  );

  const priceSeries = useMemo(
    () =>
      summary.cycles.map((cycle) => ({
        label: formatDate(cycle.startDate),
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
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Duração média"
              value={
                summary.averageDays != null
                  ? `${summary.averageDays.toLocaleString("pt-BR")} dias`
                  : "—"
              }
              hint={
                summary.averageDays != null
                  ? `~${summary.averageWeeks?.toLocaleString("pt-BR")} semanas · ~${summary.averageMonths?.toLocaleString("pt-BR")} mês(es)`
                  : "Registre a próxima troca para calcular"
              }
            />
            <MetricCard
              label="Valor médio por botijão"
              value={formatCurrency(summary.averageAmount)}
              hint={`${summary.refillCount} troca(s) · total ${formatCurrency(summary.totalSpent)}`}
            />
            <MetricCard
              label="Custo por dia"
              value={summary.averageCostPerDay != null ? formatCurrency(summary.averageCostPerDay) : "—"}
              hint={
                summary.averageMonthlyCost != null
                  ? `~${formatCurrency(summary.averageMonthlyCost)} por mês`
                  : undefined
              }
            />
            <MetricCard
              label="Próxima troca prevista"
              value={summary.nextRefillDate ? formatDate(summary.nextRefillDate) : "—"}
              hint={
                summary.daysUntilNext != null
                  ? summary.daysUntilNext >= 0
                    ? `Faltam ~${summary.daysUntilNext} dias`
                    : `Passou ~${Math.abs(summary.daysUntilNext)} dias da média`
                  : undefined
              }
            />
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
              <h2 className="font-display text-base font-semibold">
                Quantos dias cada botijão durou
              </h2>
              <div className="mt-3 h-64">
                {durationSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={durationSeries}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...axisProps} />
                      <Tooltip
                        {...tooltipProps}
                        formatter={(value: number) => `${value} dias`}
                      />
                      <Bar dataKey="dias" fill={seriesColor(0)} radius={barRadius} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    A duração aparece a partir da segunda troca registrada.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <TrendingDown className="size-4 text-muted-foreground" aria-hidden />
                Evolução do preço do botijão
              </h2>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceSeries}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke={seriesColor(1)}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
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

      <GasRefillDialog open={dialogOpen} onOpenChange={setDialogOpen} refill={editing} />
    </AppShell>
  );
}
