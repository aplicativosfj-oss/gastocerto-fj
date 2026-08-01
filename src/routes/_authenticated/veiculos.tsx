import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Car,
  Download,
  Droplets,
  Fuel,
  History,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { AppShell } from "@/components/app-shell";
import { FeatureGate } from "@/components/finance/feature-gate";
import { FuelDialog } from "@/components/finance/fuel-dialog";
import { PageHeader } from "@/components/finance/page-header";
import { StatTile } from "@/components/finance/stat-tile";
import { ReceiptViewer } from "@/components/finance/receipt-viewer";
import { VehicleDialog } from "@/components/finance/vehicle-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleEmblem } from "@/components/finance/vehicle-emblem";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { labelFor } from "@/lib/finance";
import {
  AUDIT_ACTIONS,
  AUDIT_FIELD_LABELS,
  useFuelAudit,
  useLogFuelAudit,
} from "@/lib/fuel-audit";
import {
  FUEL_TYPES,
  VEHICLE_TYPES,
  downloadCsv,
  fuelStatsCsv,
  statsByVehicle,
  summarizeFuel,
  useDeleteFuelEntry,
  useDeleteVehicle,
  useFuelEntries,
  useVehicles,
  type FuelEntry,
  type Vehicle,
} from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/veiculos")({
  head: () => ({
    meta: [
      { title: "Veículos e combustível — GastoCerto" },
      {
        name: "description",
        content: "Controle abastecimentos, consumo médio em km/l e custo por quilômetro.",
      },
      { property: "og:title", content: "Veículos e combustível — GastoCerto" },
      {
        property: "og:description",
        content: "Controle abastecimentos, consumo médio em km/l e custo por quilômetro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VehiclesPage,
});

function Metric({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon?: any; tone?: any }) {
  return (
    <StatTile 
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      tone={tone}
      className="sm:p-3.5"
    />
  );
}

function VehiclesPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: entries, isLoading: loadingEntries } = useFuelEntries(
    vehicleFilter === "all" ? undefined : vehicleFilter,
  );

  const deleteVehicle = useDeleteVehicle();
  const deleteEntry = useDeleteFuelEntry();
  const logAudit = useLogFuelAudit();
  const { data: auditLog } = useFuelAudit(
    vehicleFilter === "all" ? undefined : vehicleFilter,
    30,
  );

  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [fuelDialog, setFuelDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [confirmVehicle, setConfirmVehicle] = useState<Vehicle | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<FuelEntry | null>(null);

  const filtered = useMemo(() => {
    return (entries ?? []).filter((entry) => {
      if (fuelFilter !== "all" && entry.fuel_type !== fuelFilter) return false;
      if (from && entry.entry_date < from) return false;
      if (to && entry.entry_date > to) return false;
      return true;
    });
  }, [entries, fuelFilter, from, to]);

  const summary = useMemo(() => summarizeFuel(filtered), [filtered]);
  const perVehicle = useMemo(
    () =>
      statsByVehicle(
        (vehicles ?? []).filter(
          (vehicle) => vehicleFilter === "all" || vehicle.id === vehicleFilter,
        ),
        filtered,
      ).filter((item) => item.summary.entries > 0),
    [vehicles, filtered, vehicleFilter],
  );
  const vehicleNames = useMemo(
    () => new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle.name])),
    [vehicles],
  );


  function exportFuelCsv() {
    const csv = fuelStatsCsv(perVehicle, { from, to });
    const suffix = from || to ? `${from || "inicio"}_${to || "hoje"}` : "geral";
    downloadCsv(csv, `combustivel-por-veiculo-${suffix}.csv`);
    toast.success("CSV exportado.");
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    try {
      await deleteVehicle.mutateAsync(vehicle.id);
      setConfirmVehicle(null);
      toast.success("Veículo removido.");
    } catch (error) {
      console.error("[veiculos] falha ao remover", error);
      toast.error("Não foi possível remover o veículo.");
    }
  }

  async function handleDeleteEntry(entry: FuelEntry) {
    try {
      await deleteEntry.mutateAsync(entry);
      await logAudit
        .mutateAsync({
          action: "delete",
          vehicleId: entry.vehicle_id,
          fuelEntryId: entry.id,
          odometerBefore: Number(entry.odometer),
          odometerAfter: null,
          notes: `Abastecimento de ${entry.entry_date} removido.`,
        })
        .catch((error) => console.error("[auditoria] falha ao registrar", error));
      setConfirmEntry(null);
      toast.success("Abastecimento removido.");
    } catch (error) {
      console.error("[abastecimentos] falha ao remover", error);
      toast.error("Não foi possível remover o abastecimento.");
    }
  }

  return (
    <AppShell>
      <FeatureGate feature="vehicles">
      <div className="mx-auto max-w-6xl space-y-4">
        <PageHeader
          icon={Fuel}
          eyebrow="Frota e combustível"
          title="Veículos e combustível"
          description="Consumo médio, custo por km e histórico completo dos abastecimentos."
          className="lg:p-4"
          actions={
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button variant="outline" size="sm" className="h-9 px-3 sm:h-10 sm:px-4" asChild>
                <Link to="/veiculos-configuracoes">
                  <Settings2 className="mr-1.5 size-4" />
                  Metas
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-3 sm:h-10 sm:px-4" asChild>
                <Link to="/veiculos-auditoria">
                  <History className="mr-1.5 size-4" />
                  Logs
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 sm:h-10 sm:px-4"
                disabled={perVehicle.length === 0}
                onClick={exportFuelCsv}
              >
                <Download className="mr-1.5 size-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 sm:h-10 sm:px-4"
                onClick={() => {
                  setEditingVehicle(null);
                  setVehicleDialog(true);
                }}
              >
                <Car className="mr-1.5 size-4" />
                Novo veículo
              </Button>
              <Button
                size="sm"
                className="h-9 px-3 sm:h-10 sm:px-4"
                disabled={(vehicles ?? []).length === 0}
                onClick={() => {
                  setEditingEntry(null);
                  setFuelDialog(true);
                }}
              >
                <Plus className="mr-1.5 size-4" />
                Lançar gasto
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : (vehicles ?? []).length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Fuel className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Cadastre seu primeiro veículo para acompanhar combustível e manutenção.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setEditingVehicle(null);
                setVehicleDialog(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Cadastrar veículo
            </Button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(vehicles ?? []).map((vehicle) => (
              <article
                key={vehicle.id}
                className="interactive-card group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-soft transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="shrink-0 transition-transform group-hover:scale-105">
                      <VehicleEmblem vehicleType={vehicle.vehicle_type} className="size-11 sm:size-12" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground sm:text-[16px]">
                        {vehicle.name}
                      </h2>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ") ||
                          labelFor(VEHICLE_TYPES, vehicle.vehicle_type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => {
                        setEditingVehicle(vehicle);
                        setVehicleDialog(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmVehicle(vehicle)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="bg-muted/60 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {labelFor(FUEL_TYPES, vehicle.fuel_type)}
                  </Badge>
                  {vehicle.plate && (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-border/60 rounded-md">
                      {vehicle.plate}
                    </Badge>
                  )}
                  {vehicle.tank_capacity && (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-border/60 rounded-md">
                      {vehicle.tank_capacity}L
                    </Badge>
                  )}
                </div>

                <div className="mt-5 border-t border-border/50 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-center text-[11px] font-bold uppercase tracking-[0.1em] text-brand hover:bg-brand/5"
                    onClick={() => {
                      setEditingEntry(null);
                      setVehicleFilter(vehicle.id);
                      setFuelDialog(true);
                    }}
                  >
                    <Plus className="mr-1.5 size-3" />
                    Abastecer
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 auto-cards-sm">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger aria-label="Filtrar por veículo">
              <SelectValue />
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

          <Select value={fuelFilter} onValueChange={setFuelFilter}>
            <SelectTrigger aria-label="Filtrar por combustível">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os combustíveis</SelectItem>
              {FUEL_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Data inicial"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Data final"
          />
        </section>

        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Gasto no filtro"
            value={formatCurrency(summary.total)}
            hint={`${summary.entries} abastecimentos`}
            icon={Fuel}
            tone="brand"
          />
          <Metric
            label="Consumo médio"
            value={summary.averageConsumption ? `${summary.averageConsumption} km/l` : "—"}
            hint={`${summary.liters} litros totais`}
            icon={Droplets}
            tone="success"
          />
          <Metric
            label="Custo por km"
            value={summary.costPerKm ? formatCurrency(summary.costPerKm) : "—"}
            hint={`${summary.distance} km rodados`}
            icon={Car}
            tone="neutral"
          />
          <Metric
            label="Preço médio"
            value={summary.averagePrice ? formatCurrency(summary.averagePrice) : "—"}
            hint={summary.best?.consumption ? `Recorde: ${summary.best.consumption} km/l` : "—"}
            icon={TriangleAlert}
            tone="warning"
          />
        </section>

        {perVehicle.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Desempenho por veículo</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {perVehicle.map(({ vehicle, summary: stats, target, threshold, deviation, alert, budgetAlert }) => (
                <article
                  key={vehicle.id}
                  className={cn(
                    "interactive-card rounded-xl border bg-card p-5 shadow-soft",
                    alert ? "border-destructive/30" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold tracking-tight">{vehicle.name}</h3>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Métrica atual</p>
                    </div>
                    <Badge variant={alert ? "destructive" : "secondary"} className="h-6 px-2 text-[12px] font-bold rounded-lg">
                      {stats.averageConsumption ? `${stats.averageConsumption} km/l` : "—"}
                    </Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Gasto Total</dt>
                      <dd className="text-sm font-bold tabular-nums">{formatCurrency(stats.total)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Custo/km</dt>
                      <dd className="text-sm font-bold tabular-nums">
                        {stats.costPerKm ? formatCurrency(stats.costPerKm) : "—"}
                      </dd>
                    </div>
                  </div>
                  
                  {target && (
                    <div className="mt-5 border-t border-border/40 pt-4">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>Meta: {target} km/l</span>
                        <span className={cn(deviation && deviation > 0 ? "text-success" : "text-destructive")}>
                          {deviation != null ? `${deviation > 0 ? "+" : ""}${deviation}%` : "—"}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div 
                          className={cn("h-full rounded-full transition-all", alert ? "bg-destructive" : "bg-success")}
                          style={{ width: `${Math.min(100, (Number(stats.averageConsumption ?? 0) / target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {alert && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-[11px] font-semibold text-destructive">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span>Consumo abaixo da meta. Verifique calibragem ou manutenção.</span>
                    </div>
                  )}
                  {budgetAlert && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span>Gasto acima do teto mensal para este veículo.</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null}



        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="bg-muted/30 border-b border-border/50 px-4 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Histórico de abastecimentos</h3>
          </div>
          {loadingEntries ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground/40">
                <Droplets className="size-7" />
              </div>
              <p className="mt-5 text-sm font-semibold">Nenhum abastecimento encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Tente ajustar os filtros ou registre um novo gasto.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Data</TableHead>
                    <TableHead className="hidden font-bold text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">Veículo</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Odômetro</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Litros</TableHead>
                    <TableHead className="hidden sm:table-cell text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">R$/L</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Total</TableHead>
                    <TableHead className="hidden lg:table-cell text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">km/l</TableHead>
                    <TableHead className="w-20 text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(entry.entry_date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {vehicleNames.get(entry.vehicle_id) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{entry.odometer}</TableCell>
                    <TableCell className="text-right tabular-nums">{entry.liters}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums">
                      {formatCurrency(Number(entry.price_per_liter))}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(Number(entry.total_amount))}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums">
                      {entry.consumption ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        {entry.attachment_url ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Ver comprovante"
                            onClick={() => setReceipt(entry.attachment_url)}
                          >
                            <Droplets className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar abastecimento"
                          onClick={() => {
                            setEditingEntry(entry);
                            setFuelDialog(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover abastecimento"
                          onClick={() => setConfirmEntry(entry)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <History className="size-4" />
            Histórico de auditoria
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada edição de odômetro ou abastecimento fica registrada com autor, valores anteriores
            e alertas acionados no momento de salvar.
          </p>
          {(auditLog ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum registro de auditoria ainda.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(auditLog ?? []).map((log) => (
                <li key={log.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {AUDIT_ACTIONS[log.action] ?? log.action}
                      {log.vehicle_id ? ` · ${vehicleNames.get(log.vehicle_id) ?? "veículo"}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")} ·{" "}
                      {log.actor_name ?? "Você"}
                    </span>
                  </div>
                  {log.odometer_after != null || log.odometer_before != null ? (
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      Odômetro: {log.odometer_before ?? "—"} → {log.odometer_after ?? "—"} km
                    </p>
                  ) : null}
                  {Object.keys((log.changes ?? {}) as Record<string, unknown>).length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                      {Object.entries(
                        log.changes as Record<string, { before: unknown; after: unknown }>,
                      ).map(([field, value]) => (
                        <li key={field}>
                          {AUDIT_FIELD_LABELS[field] ?? field}: {String(value.before ?? "—")} →{" "}
                          {String(value.after ?? "—")}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {(log.warnings ?? []).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(log.warnings ?? []).map((warning) => (
                        <Badge key={warning} variant="outline" className="text-amber-600">
                          {warning}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {log.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{log.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {vehicleDialog ? (
        <VehicleDialog
          key={editingVehicle?.id ?? "new-vehicle"}
          open={vehicleDialog}
          onOpenChange={setVehicleDialog}
          vehicle={editingVehicle}
        />
      ) : null}

      {fuelDialog ? (
        <FuelDialog
          key={editingEntry?.id ?? "new-fuel"}
          open={fuelDialog}
          onOpenChange={setFuelDialog}
          vehicles={vehicles ?? []}
          defaultVehicleId={vehicleFilter === "all" ? undefined : vehicleFilter}
          entry={editingEntry}
        />
      ) : null}

      <ReceiptViewer
        path={receipt}
        open={receipt !== null}
        onOpenChange={(value) => !value && setReceipt(null)}
      />

      <AlertDialog
        open={confirmVehicle !== null}
        onOpenChange={() => setConfirmVehicle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de abastecimentos ligado a este veículo também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmVehicle && handleDeleteVehicle(confirmVehicle)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEntry !== null} onOpenChange={() => setConfirmEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover abastecimento?</AlertDialogTitle>
            <AlertDialogDescription>
              A despesa vinculada, se existir, também será excluída do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmEntry && handleDeleteEntry(confirmEntry)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FeatureGate>
    </AppShell>
  );
}
