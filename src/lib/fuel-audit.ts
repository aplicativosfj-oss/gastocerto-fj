import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

export type FuelAuditEntry = Tables<"fuel_audit_log">;

export const AUDIT_ACTIONS: Record<string, string> = {
  create: "Abastecimento registrado",
  update: "Abastecimento editado",
  delete: "Abastecimento removido",
  settings: "Configurações do veículo",
};

/** Histórico de auditoria de odômetro e abastecimentos. */
export function useFuelAudit(vehicleId?: string, limit = 100) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fuel-audit", user?.id, vehicleId ?? "all", limit],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FuelAuditEntry[]> => {
      let query = supabase
        .from("fuel_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type AuditInput = {
  action: keyof typeof AUDIT_ACTIONS | string;
  vehicleId?: string | null;
  fuelEntryId?: string | null;
  odometerBefore?: number | null;
  odometerAfter?: number | null;
  changes?: Record<string, { before: unknown; after: unknown }>;
  warnings?: string[];
  notes?: string | null;
  actorName?: string | null;
};

/** Registra uma linha no histórico de auditoria. Nunca quebra o fluxo principal. */
export function useLogFuelAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AuditInput) => {
      if (!user) return;
      const { error } = await supabase.from("fuel_audit_log").insert({
        user_id: user.id,
        vehicle_id: input.vehicleId ?? null,
        fuel_entry_id: input.fuelEntryId ?? null,
        action: input.action,
        actor_name:
          input.actorName ??
          (user.user_metadata?.full_name as string | undefined) ??
          user.email ??
          null,
        odometer_before: input.odometerBefore ?? null,
        odometer_after: input.odometerAfter ?? null,
        changes: (input.changes ?? {}) as unknown as Json,
        warnings: input.warnings ?? [],
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fuel-audit"] }),
  });
}

/** Compara dois objetos e devolve apenas os campos alterados. */
export function diffValues(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  fields: string[],
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const field of fields) {
    const previous = before?.[field] ?? null;
    const next = after[field] ?? null;
    if (String(previous ?? "") !== String(next ?? "")) {
      changes[field] = { before: previous, after: next };
    }
  }
  return changes;
}

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  entry_date: "Data",
  odometer: "Odômetro",
  liters: "Litros",
  price_per_liter: "Preço por litro",
  total_amount: "Valor total",
  fuel_type: "Combustível",
  station: "Posto",
  full_tank: "Tanque cheio",
  notes: "Observações",
  attachment_url: "Comprovante",
  target_consumption: "Meta de consumo",
  alert_threshold: "Limite de alerta (%)",
  monthly_fuel_budget: "Teto mensal",
  alerts_enabled: "Alertas ativos",
};
