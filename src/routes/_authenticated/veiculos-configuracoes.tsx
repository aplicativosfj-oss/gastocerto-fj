import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Gauge, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { parseAmount } from "@/lib/finance";
import { MoneyInput } from "@/components/ui/money-input";
import { diffValues, useLogFuelAudit } from "@/lib/fuel-audit";
import { useSaveVehicleSettings, useVehicles, type Vehicle } from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/veiculos-configuracoes")({
  head: () => ({
    meta: [
      { title: "Metas e alertas de combustível — GastoCerto" },
      {
        name: "description",
        content:
          "Defina meta de consumo, tolerância de alerta e teto mensal de combustível para cada veículo.",
      },
      { property: "og:title", content: "Metas e alertas de combustível — GastoCerto" },
      {
        property: "og:description",
        content:
          "Defina meta de consumo, tolerância de alerta e teto mensal de combustível para cada veículo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VehicleSettingsPage,
});

function VehicleSettingsPage() {
  const { data: vehicles, isLoading } = useVehicles(true);

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="page-title">Metas e alertas por veículo</h1>
            <p className="page-subtitle mt-1">
              Ajuste a meta de consumo, a tolerância do alerta e o teto mensal de combustível.
              Você pode revisar esses limites sempre que quiser.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/veiculos">
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Link>
          </Button>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full" />
            ))}
          </div>
        ) : (vehicles ?? []).length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Gauge className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Cadastre um veículo para configurar metas e alertas.
            </p>
          </section>
        ) : (
          <div className="auto-cards-lg">
            {(vehicles ?? []).map((vehicle) => (
              <VehicleSettingsCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function VehicleSettingsCard({ vehicle }: { vehicle: Vehicle }) {
  const save = useSaveVehicleSettings();
  const logAudit = useLogFuelAudit();

  const [target, setTarget] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [budget, setBudget] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTarget(vehicle.target_consumption != null ? String(vehicle.target_consumption) : "");
    setThreshold(String(vehicle.alert_threshold ?? 10));
    setBudget(vehicle.monthly_fuel_budget != null ? String(vehicle.monthly_fuel_budget) : "");
    setEnabled(vehicle.alerts_enabled !== false);
  }, [vehicle]);

  async function handleSave() {
    const targetValue = target ? parseAmount(target) : null;
    const thresholdValue = Number(threshold);
    const budgetValue = budget ? parseAmount(budget) : null;

    if (targetValue != null && (!Number.isFinite(targetValue) || targetValue <= 0)) {
      setError("Meta de consumo inválida.");
      return;
    }
    if (!Number.isFinite(thresholdValue) || thresholdValue < 1 || thresholdValue > 90) {
      setError("A tolerância deve ficar entre 1% e 90%.");
      return;
    }
    if (budgetValue != null && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      setError("Teto mensal inválido.");
      return;
    }
    setError(null);

    const values = {
      target_consumption: targetValue,
      alert_threshold: Math.round(thresholdValue),
      monthly_fuel_budget: budgetValue,
      alerts_enabled: enabled,
    };

    try {
      await save.mutateAsync({ id: vehicle.id, values });
      await logAudit
        .mutateAsync({
          action: "settings",
          vehicleId: vehicle.id,
          changes: diffValues(
            vehicle as unknown as Record<string, unknown>,
            values,
            Object.keys(values),
          ),
          notes: `Configurações de alerta de ${vehicle.name} atualizadas.`,
        })
        .catch((auditError) => console.error("[auditoria] falha ao registrar", auditError));
      toast.success("Configurações salvas.");
    } catch (saveError) {
      console.error("[veiculos] falha ao salvar configurações", saveError);
      toast.error("Não foi possível salvar as configurações.");
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{vehicle.name}</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[vehicle.brand, vehicle.model, vehicle.plate].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`alerts-${vehicle.id}`} className="text-xs font-normal">
            Alertas
          </Label>
          <Switch id={`alerts-${vehicle.id}`} checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </header>

      <div className="mt-4 auto-cards-md">
        <div>
          <Label htmlFor={`target-${vehicle.id}`}>Meta de consumo (km/l)</Label>
          <Input
            id={`target-${vehicle.id}`}
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="mt-1.5 tabular-nums"
            placeholder="Ex.: 12,5"
          />
        </div>
        <div>
          <Label htmlFor={`threshold-${vehicle.id}`}>Tolerância do alerta (%)</Label>
          <Input
            id={`threshold-${vehicle.id}`}
            inputMode="numeric"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="mt-1.5 tabular-nums"
            placeholder="10"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`budget-${vehicle.id}`}>Teto mensal de combustível (R$)</Label>
          <MoneyInput
            id={`budget-${vehicle.id}`}
            value={budget}
            onValueChange={setBudget}
            className="mt-1.5"
            placeholder="Opcional"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        O alerta dispara quando o consumo médio do período fica {threshold || "10"}% abaixo da
        meta, ou quando o gasto passa do teto informado.
      </p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Salvar
        </Button>
      </div>
    </article>
  );
}
