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

                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => setDetail(log)}>
                      <Diff className="mr-2 size-4" />
                      Ver antes/depois
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AuditDetailDialog
        log={detail}
        vehicleName={detail?.vehicle_id ? vehicleNames.get(detail.vehicle_id) : undefined}
        open={detail !== null}
        onOpenChange={(value) => !value && setDetail(null)}
      />
    </AppShell>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function CompareRow({
  label,
  before,
  after,
}: {
  label: string;
  before: unknown;
  after: unknown;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-border p-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label} · antes</p>
        <p className="truncate text-sm tabular-nums text-muted-foreground line-through">
          {formatValue(before)}
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-right">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label} · depois
        </p>
        <p className="truncate text-sm font-semibold tabular-nums">{formatValue(after)}</p>
      </div>
    </div>
  );
}

function AuditDetailDialog({
  log,
  vehicleName,
  open,
  onOpenChange,
}: {
  log: FuelAuditEntry | null;
  vehicleName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changes = (log?.changes ?? {}) as Record<string, { before: unknown; after: unknown }>;
  const odometerBefore = log?.odometer_before ?? null;
  const odometerAfter = log?.odometer_after ?? null;
  const odometerDelta =
    odometerBefore != null && odometerAfter != null ? Number(odometerAfter) - Number(odometerBefore) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalhes da alteração</DialogTitle>
          <DialogDescription>
            Comparação antes/depois dos valores e alertas acionados no momento de salvar.
          </DialogDescription>
        </DialogHeader>

        {log ? (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-xl bg-secondary/50 p-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Ação: </span>
                {AUDIT_ACTIONS[log.action] ?? log.action}
              </p>
              <p>
                <span className="text-muted-foreground">Veículo: </span>
                {vehicleName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Autor: </span>
                {log.actor_name ?? "Você"}
              </p>
              <p>
                <span className="text-muted-foreground">Quando: </span>
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </p>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Odômetro</h3>
              {odometerBefore == null && odometerAfter == null ? (
                <p className="text-sm text-muted-foreground">
                  Esta alteração não envolveu o odômetro.
                </p>
              ) : (
                <>
                  <CompareRow
                    label="Odômetro (km)"
                    before={odometerBefore}
                    after={odometerAfter}
                  />
                  {odometerDelta != null ? (
                    <p
                      className={
                        odometerDelta < 0
                          ? "text-xs font-medium text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      Variação: {odometerDelta > 0 ? "+" : ""}
                      {odometerDelta.toLocaleString("pt-BR")} km
                      {odometerDelta < 0 ? " (retrocesso registrado)" : ""}
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Campos alterados</h3>
              {Object.keys(changes).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum campo adicional alterado.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(changes).map(([field, value]) => (
                    <CompareRow
                      key={field}
                      label={AUDIT_FIELD_LABELS[field] ?? field}
                      before={value.before}
                      after={value.after}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Alertas acionados</h3>
              {(log.warnings ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum alerta foi acionado nesta alteração.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(log.warnings ?? []).map((warning) => (
                    <li
                      key={warning}
                      className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {log.notes ? (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold">Observações</h3>
                <p className="text-sm text-muted-foreground">{log.notes}</p>
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
