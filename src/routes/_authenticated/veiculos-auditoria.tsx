import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, History, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIT_ACTIONS, AUDIT_FIELD_LABELS, useFuelAudit } from "@/lib/fuel-audit";
import { useVehicles } from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/veiculos-auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria de abastecimentos — GastoCerto" },
      {
        name: "description",
        content:
          "Histórico completo de alterações de odômetro e abastecimentos, com autor e alertas.",
      },
      { property: "og:title", content: "Auditoria de abastecimentos — GastoCerto" },
      {
        property: "og:description",
        content:
          "Histórico completo de alterações de odômetro e abastecimentos, com autor e alertas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FuelAuditPage,
});

function FuelAuditPage() {
  const { data: vehicles } = useVehicles(true);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: logs, isLoading } = useFuelAudit(
    vehicleFilter === "all" ? undefined : vehicleFilter,
    500,
  );

  const vehicleNames = useMemo(
    () => new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle.name])),
    [vehicles],
  );

  const items = useMemo(() => {
    return (logs ?? []).filter((log) => {
      const day = log.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (onlyWarnings && (log.warnings ?? []).length === 0) return false;
      return true;
    });
  }, [logs, from, to, actionFilter, onlyWarnings]);

  const warningCount = items.filter((log) => (log.warnings ?? []).length > 0).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <History className="size-5" />
              Auditoria de odômetro e abastecimentos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} registro(s) · {warningCount} com alertas acionados.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/veiculos">
              <ArrowLeft className="mr-2 size-4" />
              Voltar aos veículos
            </Link>
          </Button>
        </header>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Veículo</Label>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="mt-1.5" aria-label="Filtrar por veículo">
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
          </div>

          <div>
            <Label>Ação</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="mt-1.5" aria-label="Filtrar por ação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(AUDIT_ACTIONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="audit-from">De</Label>
            <Input
              id="audit-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="audit-to">Até</Label>
            <Input
              id="audit-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <Button
              type="button"
              variant={onlyWarnings ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyWarnings((value) => !value)}
            >
              <TriangleAlert className="mr-2 size-4" />
              Somente com alertas
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setVehicleFilter("all");
                setActionFilter("all");
                setOnlyWarnings(false);
                setFrom("");
                setTo("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </section>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <History className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum registro de auditoria para os filtros selecionados.
            </p>
          </section>
        ) : (
          <ul className="space-y-3">
            {items.map((log) => {
              const changes = (log.changes ?? {}) as Record<
                string,
                { before: unknown; after: unknown }
              >;
              return (
                <li key={log.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{AUDIT_ACTIONS[log.action] ?? log.action}</Badge>
                      {log.vehicle_id ? (
                        <span className="font-medium">
                          {vehicleNames.get(log.vehicle_id) ?? "Veículo removido"}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")} ·{" "}
                      {log.actor_name ?? "Você"}
                    </span>
                  </div>

                  {log.odometer_after != null || log.odometer_before != null ? (
                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                      Odômetro: {log.odometer_before ?? "—"} → {log.odometer_after ?? "—"} km
                    </p>
                  ) : null}

                  {Object.keys(changes).length > 0 ? (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                      {Object.entries(changes).map(([field, value]) => (
                        <li key={field}>
                          {AUDIT_FIELD_LABELS[field] ?? field}: {String(value.before ?? "—")} →{" "}
                          {String(value.after ?? "—")}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {(log.warnings ?? []).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(log.warnings ?? []).map((warning) => (
                        <Badge key={warning} variant="outline" className="text-amber-600">
                          <TriangleAlert className="mr-1 size-3" />
                          {warning}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {log.notes ? (
                    <p className="mt-2 text-xs text-muted-foreground">{log.notes}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
