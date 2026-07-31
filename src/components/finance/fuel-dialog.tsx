import { useMemo, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { ReceiptField } from "@/components/finance/receipt-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isoDate, parseAmount, toCents } from "@/lib/finance";
import { diffValues, useLogFuelAudit } from "@/lib/fuel-audit";
import { formatCurrency } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useAccounts } from "@/lib/transactions";
import { sanitizeText } from "@/lib/validation";
import {
  FUEL_TYPES,
  computeFuelMetrics,
  odometerWarnings,
  round,
  useFuelEntries,
  useSaveFuelEntry,
  validateOdometer,
  type FuelEntry,
  type Vehicle,
} from "@/lib/vehicles";

export function FuelDialog({
  open,
  onOpenChange,
  vehicles,
  defaultVehicleId,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
  entry?: FuelEntry | null;
}) {
  const save = useSaveFuelEntry();
  const logAudit = useLogFuelAudit();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const [vehicleId, setVehicleId] = useState(
    entry?.vehicle_id ?? defaultVehicleId ?? vehicles[0]?.id ?? "",
  );
  const { data: entries } = useFuelEntries(vehicleId || undefined);

  const [date, setDate] = useState(entry?.entry_date ?? isoDate(new Date()));
  const [odometer, setOdometer] = useState(entry ? String(entry.odometer) : "");
  const [liters, setLiters] = useState(entry ? String(entry.liters).replace(".", ",") : "");
  const [pricePerLiter, setPricePerLiter] = useState(
    entry ? String(entry.price_per_liter).replace(".", ",") : "",
  );
  const [totalTouched, setTotalTouched] = useState(false);
  const [total, setTotal] = useState(
    entry ? String(entry.total_amount).replace(".", ",") : "",
  );
  const [fuelType, setFuelType] = useState(entry?.fuel_type ?? "gasolina");
  const [station, setStation] = useState(entry?.station ?? "");
  const [fullTank, setFullTank] = useState(entry?.full_tank ?? true);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [attachment, setAttachment] = useState<string | null>(entry?.attachment_url ?? null);
  const [createExpense, setCreateExpense] = useState(!entry);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState(false);

  const vehicle = vehicles.find((item) => item.id === vehicleId);

  const litersValue = parseAmount(liters);
  const priceValue = parseAmount(pricePerLiter);
  const computedTotal = totalTouched
    ? parseAmount(total)
    : Number.isFinite(litersValue) && Number.isFinite(priceValue)
      ? toCents(litersValue * priceValue)
      : Number.NaN;

  const preview = useMemo(() => {
    const odometerValue = parseAmount(odometer);
    if (!Number.isFinite(odometerValue) || !Number.isFinite(litersValue)) return null;
    return computeFuelMetrics(
      odometerValue,
      litersValue,
      Number.isFinite(computedTotal) ? computedTotal : 0,
      date,
      entries ?? [],
      entry?.id,
    );
  }, [odometer, litersValue, computedTotal, date, entries, entry?.id]);

  const fuelCategoryId = useMemo(
    () =>
      (categories ?? []).find(
        (category) => category.type === "expense" && /combust/i.test(category.name),
      )?.id ?? null,
    [categories],
  );
  const [accountId, setAccountId] = useState("");

  const warnings = useMemo(
    () =>
      odometerWarnings(
        parseAmount(odometer),
        litersValue,
        date,
        vehicle,
        entries ?? [],
        entry?.id,
      ),
    [odometer, litersValue, date, vehicle, entries, entry?.id],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const odometerValue = parseAmount(odometer);
    const totalValue = Number.isFinite(computedTotal) ? toCents(computedTotal) : Number.NaN;

    if (!vehicleId) nextErrors.vehicle = "Selecione um veículo.";
    if (!date) nextErrors.date = "Informe a data.";
    if (date > isoDate(new Date())) nextErrors.date = "A data não pode ser futura.";
    if (!Number.isFinite(litersValue) || litersValue <= 0) nextErrors.liters = "Informe os litros.";
    if (litersValue > 1000) nextErrors.liters = "Quantidade de litros muito alta.";
    if (!Number.isFinite(priceValue) || priceValue <= 0)
      nextErrors.price = "Informe o preço por litro.";
    if (!Number.isFinite(totalValue) || totalValue <= 0) nextErrors.total = "Valor inválido.";

    const odometerCheck = validateOdometer(
      odometerValue,
      date,
      vehicle,
      entries ?? [],
      entry?.id,
    );
    if (!odometerCheck.ok) nextErrors.odometer = odometerCheck.message;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (warnings.length > 0 && !acknowledged) {
      setAcknowledged(true);
      toast.warning("Confira os avisos e clique em salvar novamente para confirmar.");
      return;
    }

    const metrics = computeFuelMetrics(
      odometerValue,
      litersValue,
      totalValue,
      date,
      entries ?? [],
      entry?.id,
    );

    try {
      await save.mutateAsync({
        id: entry?.id,
        values: {
          vehicle_id: vehicleId,
          entry_date: date,
          odometer: odometerValue,
          liters: round(litersValue, 3),
          price_per_liter: round(priceValue, 3),
          total_amount: totalValue,
          fuel_type: fuelType,
          station: station ? sanitizeText(station) : null,
          full_tank: fullTank,
          distance: metrics.distance,
          consumption: metrics.consumption,
          cost_per_km: metrics.costPerKm,
          notes: notes ? sanitizeText(notes) : null,
          attachment_url: attachment,
        },
        createTransaction:
          !entry && createExpense
            ? { categoryId: fuelCategoryId, accountId: accountId || null }
            : undefined,
      });
      const values = {
        entry_date: date,
        odometer: odometerValue,
        liters: round(litersValue, 3),
        price_per_liter: round(priceValue, 3),
        total_amount: totalValue,
        fuel_type: fuelType,
        station: station ? sanitizeText(station) : null,
        full_tank: fullTank,
        notes: notes ? sanitizeText(notes) : null,
        attachment_url: attachment,
      };

      await logAudit
        .mutateAsync({
          action: entry ? "update" : "create",
          vehicleId: vehicleId,
          fuelEntryId: entry?.id ?? null,
          odometerBefore: entry ? Number(entry.odometer) : null,
          odometerAfter: odometerValue,
          changes: diffValues(
            entry as unknown as Record<string, unknown> | null,
            values,
            Object.keys(values),
          ),
          warnings,
          notes: warnings.length > 0 ? "Salvo com avisos confirmados pelo usuário." : null,
        })
        .catch((error) => console.error("[auditoria] falha ao registrar", error));

      toast.success(entry ? "Abastecimento atualizado." : "Abastecimento registrado.");
      onOpenChange(false);
    } catch (error) {
      console.error("[abastecimentos] falha ao salvar", error);
      toast.error("Não foi possível salvar o abastecimento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar gasto do veículo" : "Novo gasto do veículo"}</DialogTitle>
          <DialogDescription>
            Informe os dados do abastecimento. O consumo (km/l) e o custo por km são calculados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <Label>Veículo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicle ? (
              <p className="mt-1 text-xs text-destructive">{errors.vehicle}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="fuel-date">Data</Label>
            <Input
              id="fuel-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Aceita abastecimentos de dias e meses anteriores.
            </p>
            {errors.date ? <p className="mt-1 text-xs text-destructive">{errors.date}</p> : null}
          </div>

          <div>
            <Label htmlFor="fuel-odometer">Odômetro (km)</Label>
            <Input
              id="fuel-odometer"
              inputMode="decimal"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              className="mt-1.5 tabular-nums"
              placeholder="Ex.: 58230"
            />
            {errors.odometer ? (
              <p className="mt-1 text-xs text-destructive">{errors.odometer}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="fuel-liters">Litros</Label>
            <Input
              id="fuel-liters"
              inputMode="decimal"
              value={liters}
              onChange={(event) => setLiters(event.target.value)}
              className="mt-1.5 tabular-nums"
              placeholder="0,00"
            />
            {errors.liters ? <p className="mt-1 text-xs text-destructive">{errors.liters}</p> : null}
          </div>

          <div>
            <Label htmlFor="fuel-price">Preço por litro (R$)</Label>
            <Input
              id="fuel-price"
              inputMode="decimal"
              value={pricePerLiter}
              onChange={(event) => setPricePerLiter(event.target.value)}
              className="mt-1.5 tabular-nums"
              placeholder="0,000"
            />
            {errors.price ? <p className="mt-1 text-xs text-destructive">{errors.price}</p> : null}
          </div>

          <div>
            <Label htmlFor="fuel-total">Valor total (R$)</Label>
            <Input
              id="fuel-total"
              inputMode="decimal"
              value={
                totalTouched
                  ? total
                  : Number.isFinite(computedTotal)
                    ? String(computedTotal).replace(".", ",")
                    : ""
              }
              onChange={(event) => {
                setTotalTouched(true);
                setTotal(event.target.value);
              }}
              className="mt-1.5 tabular-nums"
              placeholder="Calculado automaticamente"
            />
            {errors.total ? <p className="mt-1 text-xs text-destructive">{errors.total}</p> : null}
          </div>

          <div>
            <Label>Combustível</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="fuel-station">Posto</Label>
            <Input
              id="fuel-station"
              value={station}
              onChange={(event) => setStation(event.target.value)}
              maxLength={80}
              className="mt-1.5"
            />
          </div>

          {preview?.consumption ? (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm sm:col-span-2">
              <p className="font-medium">Prévia dos cálculos</p>
              <p className="mt-1 text-muted-foreground tabular-nums">
                {preview.distance} km rodados · {preview.consumption} km/l ·{" "}
                {formatCurrency(preview.costPerKm ?? 0)} por km
              </p>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:col-span-2">
              <p className="flex items-center gap-2 font-medium">
                <TriangleAlert className="size-4" />
                Variações fora do padrão
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              {acknowledged ? (
                <p className="mt-2 text-xs font-medium">
                  Clique em salvar novamente para confirmar mesmo assim.
                </p>
              ) : null}
            </div>
          ) : null}



          <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
            <Label htmlFor="fuel-full" className="text-sm font-normal">
              Tanque cheio (melhora a precisão do consumo)
            </Label>
            <Switch id="fuel-full" checked={fullTank} onCheckedChange={setFullTank} />
          </div>

          {!entry ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
                <Label htmlFor="fuel-expense" className="text-sm font-normal">
                  Lançar também como despesa
                </Label>
                <Switch
                  id="fuel-expense"
                  checked={createExpense}
                  onCheckedChange={setCreateExpense}
                />
              </div>
              {createExpense ? (
                <div className="sm:col-span-2">
                  <Label>Conta (opcional)</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sem conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="sm:col-span-2">
            <ReceiptField value={attachment} onChange={setAttachment} label="Comprovante / nota" />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="fuel-notes">Observações</Label>
            <Textarea
              id="fuel-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1.5"
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
