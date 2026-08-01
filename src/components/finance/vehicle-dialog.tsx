import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { parseAmount } from "@/lib/finance";
import { sanitizeText } from "@/lib/validation";
import { usePlanAccess } from "@/hooks/use-plan";
import { FUEL_TYPES, VEHICLE_TYPES, useSaveVehicle, type Vehicle } from "@/lib/vehicles";

export function VehicleDialog({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
}) {
  const save = useSaveVehicle();
  const { data: access } = usePlanAccess();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(vehicle?.name ?? "");
  const [type, setType] = useState(vehicle?.vehicle_type ?? "car");
  const [brand, setBrand] = useState(vehicle?.brand ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(vehicle?.year ? String(vehicle.year) : "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [fuelType, setFuelType] = useState(vehicle?.fuel_type ?? "gasolina");
  const [tank, setTank] = useState(vehicle?.tank_capacity ? String(vehicle.tank_capacity) : "");
  const [odometer, setOdometer] = useState(
    vehicle?.initial_odometer != null ? String(vehicle.initial_odometer) : "",
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const cleanName = sanitizeText(name);
    const cleanPlate = sanitizeText(plate).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const yearValue = year ? Number(year) : null;
    const initialOdometer = odometer ? parseAmount(odometer) : 0;

    if (cleanName.length < 2) nextErrors.name = "Informe um nome para o veículo.";
    if (cleanName.length > 60) nextErrors.name = "Nome muito longo.";
    if (yearValue && (yearValue < 1900 || yearValue > new Date().getFullYear() + 1)) {
      nextErrors.year = "Ano inválido.";
    }
    if (cleanPlate && !/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(cleanPlate)) {
      nextErrors.plate = "Placa inválida (ex.: ABC1D23).";
    }
    if (!Number.isFinite(initialOdometer) || initialOdometer < 0) {
      nextErrors.odometer = "Quilometragem inválida.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await save.mutateAsync({
        id: vehicle?.id,
        limit: access?.limits.vehicles ?? null,
        values: {
          name: cleanName,
          vehicle_type: type,
          brand: brand ? sanitizeText(brand) : null,
          model: model ? sanitizeText(model) : null,
          year: yearValue,
          plate: cleanPlate || null,
          fuel_type: fuelType,
          tank_capacity: tank ? parseAmount(tank) : null,
          initial_odometer: initialOdometer,
        },
      });
      toast.success(vehicle ? "Veículo atualizado." : "Veículo cadastrado.");
      onOpenChange(false);
    } catch (error) {
      console.error("[veiculos] falha ao salvar", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o veículo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          <DialogDescription>
            Cadastre os dados do veículo para acompanhar consumo e custos por quilômetro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <Label htmlFor="vehicle-name">Nome</Label>
            <Input
              id="vehicle-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              className="mt-1.5"
              placeholder="Ex.: Onix da família"
            />
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Combustível principal</Label>
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

          <div>
            <Label htmlFor="vehicle-brand">Marca</Label>
            <Input
              id="vehicle-brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              maxLength={40}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="vehicle-model">Modelo</Label>
            <Input
              id="vehicle-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              maxLength={40}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="vehicle-year">Ano</Label>
            <Input
              id="vehicle-year"
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              maxLength={4}
              className="mt-1.5"
            />
            {errors.year ? <p className="mt-1 text-xs text-destructive">{errors.year}</p> : null}
          </div>

          <div>
            <Label htmlFor="vehicle-plate">Placa</Label>
            <Input
              id="vehicle-plate"
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              maxLength={8}
              className="mt-1.5 uppercase"
              placeholder="ABC1D23"
            />
            {errors.plate ? <p className="mt-1 text-xs text-destructive">{errors.plate}</p> : null}
          </div>

          <div>
            <Label htmlFor="vehicle-tank">Tanque (litros)</Label>
            <Input
              id="vehicle-tank"
              inputMode="decimal"
              value={tank}
              onChange={(event) => setTank(event.target.value)}
              className="mt-1.5 tabular-nums"
            />
          </div>

          <div>
            <Label htmlFor="vehicle-odometer">Km inicial</Label>
            <Input
              id="vehicle-odometer"
              inputMode="decimal"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              className="mt-1.5 tabular-nums"
              placeholder="0"
            />
            {errors.odometer ? (
              <p className="mt-1 text-xs text-destructive">{errors.odometer}</p>
            ) : null}
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
