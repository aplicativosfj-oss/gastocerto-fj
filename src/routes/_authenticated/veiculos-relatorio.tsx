import { createFileRoute } from "@tanstack/react-router";
import { Car, Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PeriodPicker } from "@/components/finance/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { labelFor, monthRange } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useTransactions } from "@/lib/transactions";
import { downloadCsv, useVehicles, VEHICLE_TYPES } from "@/lib/vehicles";
import { exportVehicleSpendPdf } from "@/lib/vehicle-spend-export";
import { MONTH_NAMES } from "@/lib/finance";
import {
  spendByVehicleType,
  vehicleSpendBreakdown,
  vehicleSpendCsv,
} from "@/lib/vehicle-spend";

export const Route = createFileRoute("/_authenticated/veiculos-relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório de gastos com veículo — GastoCerto" },
      {
        name: "description",
        content:
          "Gastos com veículos por período, categoria e subcategoria, com exportação em CSV.",
      },
      { property: "og:title", content: "Relatório de gastos com veículo — GastoCerto" },
      {
        property: "og:description",
        content:
          "Gastos com veículos por período, categoria e subcategoria, com exportação em CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VehicleSpendReportPage,
});

function VehicleSpendReportPage() {
  const today = new Date();
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"category" | "subcategory">("category");

  const range = monthRange(period.year, period.month);
  const { data: vehicles } = useVehicles(true);
  const { data: categories } = useCategories();
  const { data: transactions, isLoading } = useTransactions(range);

  const rows = useMemo(() => {
    const all = vehicleSpendBreakdown(transactions ?? [], vehicles ?? [], categories ?? []);
    return vehicleFilter === "all"
      ? all
      : all.filter((row) => row.vehicle?.id === vehicleFilter);
  }, [transactions, vehicles, categories, vehicleFilter]);

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const count = rows.reduce((sum, row) => sum + row.count, 0);
  const byType = useMemo(
    () => spendByVehicleType(rows, (value) => labelFor(VEHICLE_TYPES, value)),
    [rows],
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Relatório de gastos com veículo</h1>
            <p className="text-sm text-muted-foreground">
              Todos os lançamentos vinculados a um veículo no período selecionado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker year={period.year} month={period.month} onChange={setPeriod} />
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {(vehicles ?? []).map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={groupBy}
              onValueChange={(value) => setGroupBy(value as "category" | "subcategory")}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Por categoria</SelectItem>
                <SelectItem value="subcategory">Por subcategoria</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() =>
                downloadCsv(
                  vehicleSpendCsv(rows, { from: range.start, to: range.end }),
                  `gastos-veiculo-${period.year}-${String(period.month).padStart(2, "0")}.csv`,
                )
              }
            >
              <Download className="mr-2 size-4" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() =>
                exportVehicleSpendPdf(rows, {
                  from: range.start,
                  to: range.end,
                  period: `${MONTH_NAMES[period.month - 1]} de ${period.year}`,
                  vehicleLabel:
                    vehicleFilter === "all"
                      ? "Todos os veículos"
                      : ((vehicles ?? []).find((vehicle) => vehicle.id === vehicleFilter)?.name ??
                        "Veículo"),
                })
              }
            >
              <FileText className="mr-2 size-4" />
              Exportar PDF
            </Button>
          </div>
        </header>

        <section className="auto-cards-sm">
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total no período</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Lançamentos</p>
            <p className="text-lg font-semibold tabular-nums">{count}</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Veículos com gasto</p>
            <p className="text-lg font-semibold tabular-nums">{rows.length}</p>
          </article>
        </section>

        {byType.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Por tipo de veículo</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {byType.map((slice) => (
                <li
                  key={slice.id}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
                >
                  {slice.name} · {formatCurrency(slice.total)} ({slice.count})
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum gasto vinculado a veículos neste período.
          </section>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const slices = groupBy === "category" ? row.categories : row.subCategories;
              return (
                <section
                  key={row.vehicle?.id ?? row.vehicleName}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <Car className="size-4 text-muted-foreground" />
                      {row.vehicleName}
                      <Badge variant="secondary">{labelFor(VEHICLE_TYPES, row.vehicleType)}</Badge>
                      {row.vehicle?.plate ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {row.vehicle.plate}
                        </span>
                      ) : null}
                    </h2>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(row.total)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {row.count} lançamentos
                      </span>
                    </p>
                  </header>
                  <ul className="mt-3 space-y-2">
                    {slices.map((slice) => (
                      <li key={slice.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">{slice.name}</span>
                          <span className="tabular-nums">{formatCurrency(slice.total)}</span>
                        </div>
                        <Progress value={row.total > 0 ? (slice.total / row.total) * 100 : 0} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
