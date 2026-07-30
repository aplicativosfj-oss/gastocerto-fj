import { createFileRoute } from "@tanstack/react-router";
import { Car, Droplets, Fuel, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { FuelDialog } from "@/components/finance/fuel-dialog";
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
  FUEL_TYPES,
  VEHICLE_TYPES,
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

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
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
      setConfirmEntry(null);
      toast.success("Abastecimento removido.");
    } catch (error) {
      console.error("[abastecimentos] falha ao remover", error);
      toast.error("Não foi possível remover o abastecimento.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Veículos e combustível</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Consumo médio, custo por km e histórico completo dos abastecimentos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingVehicle(null);
                setVehicleDialog(true);
              }}
            >
              <Car className="mr-2 size-4" />
              Novo veículo
            </Button>
            <Button
              disabled={(vehicles ?? []).length === 0}
              onClick={() => {
                setEditingEntry(null);
                setFuelDialog(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Abastecer
            </Button>
          </div>
        </header>

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
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(vehicles ?? []).map((vehicle) => (
              <article
                key={vehicle.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{vehicle.name}</h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ") ||
                        labelFor(VEHICLE_TYPES, vehicle.vehicle_type)}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${vehicle.name}`}
                      onClick={() => {
                        setEditingVehicle(vehicle);
                        setVehicleDialog(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${vehicle.name}`}
                      onClick={() => setConfirmVehicle(vehicle)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{labelFor(FUEL_TYPES, vehicle.fuel_type)}</Badge>
                  {vehicle.plate ? <Badge variant="outline">{vehicle.plate}</Badge> : null}
                  {vehicle.tank_capacity ? (
                    <Badge variant="outline">{vehicle.tank_capacity} L</Badge>
                  ) : null}
                </div>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-xs"
                  onClick={() => {
                    setEditingEntry(null);
                    setVehicleFilter(vehicle.id);
                    setFuelDialog(true);
                  }}
                >
                  Registrar abastecimento
                </Button>
              </article>
            ))}
          </section>
        )}

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Gasto no filtro"
            value={formatCurrency(summary.total)}
            hint={`${summary.entries} abastecimento(s)`}
          />
          <Metric
            label="Consumo médio"
            value={summary.averageConsumption ? `${summary.averageConsumption} km/l` : "—"}
            hint={`${summary.liters} litros abastecidos`}
          />
          <Metric
            label="Custo por km"
            value={summary.costPerKm ? formatCurrency(summary.costPerKm) : "—"}
            hint={`${summary.distance} km percorridos`}
          />
          <Metric
            label="Preço médio do litro"
            value={summary.averagePrice ? formatCurrency(summary.averagePrice) : "—"}
            hint={
              summary.best?.consumption
                ? `Melhor média: ${summary.best.consumption} km/l`
                : "Registre dois abastecimentos para calcular"
            }
          />
        </section>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card">
          {loadingEntries ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Droplets className="mx-auto mb-2 size-6" />
              Nenhum abastecimento no período selecionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="hidden md:table-cell">Veículo</TableHead>
                  <TableHead className="text-right">Odômetro</TableHead>
                  <TableHead className="text-right">Litros</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">R$/L</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">km/l</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
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
    </AppShell>
  );
}
