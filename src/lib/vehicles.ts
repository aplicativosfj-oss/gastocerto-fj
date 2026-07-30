import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Vehicle = Tables<"vehicles">;
export type FuelEntry = Tables<"fuel_entries">;

export const VEHICLE_TYPES = [
  { value: "car", label: "Carro" },
  { value: "motorcycle", label: "Moto" },
  { value: "truck", label: "Caminhão" },
  { value: "van", label: "Van / Utilitário" },
  { value: "other", label: "Outro" },
] as const;

export const FUEL_TYPES = [
  { value: "gasolina", label: "Gasolina comum" },
  { value: "gasolina_aditivada", label: "Gasolina aditivada" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_s10", label: "Diesel S-10" },
  { value: "gnv", label: "GNV" },
  { value: "eletrico", label: "Elétrico (kWh)" },
] as const;

export function useVehicles(includeInactive = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vehicles", user?.id, includeInactive],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Vehicle[]> => {
      let query = supabase.from("vehicles").select("*").order("created_at", { ascending: true });
      if (!includeInactive) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFuelEntries(vehicleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fuel-entries", user?.id, vehicleId ?? "all"],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FuelEntry[]> => {
      let query = supabase
        .from("fuel_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("odometer", { ascending: false });
      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useRefreshFleet() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
      queryClient.invalidateQueries({ queryKey: ["fuel-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  };
}

export function useSaveVehicle() {
  const { user } = useAuth();
  const refresh = useRefreshFleet();
  return useMutation({
    mutationFn: async (input: { id?: string; values: Omit<TablesInsert<"vehicles">, "user_id"> }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("vehicles")
          .update(input.values as TablesUpdate<"vehicles">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("vehicles").insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useDeleteVehicle() {
  const refresh = useRefreshFleet();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useSaveFuelEntry() {
  const { user } = useAuth();
  const refresh = useRefreshFleet();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Omit<TablesInsert<"fuel_entries">, "user_id">;
      /** Cria também um lançamento de despesa vinculado. */
      createTransaction?: { categoryId: string | null; accountId: string | null };
    }) => {
      if (!user) throw new Error("Sessão expirada");

      if (input.id) {
        const { error } = await supabase
          .from("fuel_entries")
          .update(input.values as TablesUpdate<"fuel_entries">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }

      let transactionId: string | null = null;
      if (input.createTransaction) {
        const { data, error } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            description: `Abastecimento${input.values.station ? ` — ${input.values.station}` : ""}`,
            amount: input.values.total_amount,
            transaction_type: "expense",
            transaction_date: input.values.entry_date ?? new Date().toISOString().slice(0, 10),
            category_id: input.createTransaction.categoryId,
            account_id: input.createTransaction.accountId,
            vehicle_id: input.values.vehicle_id,
            attachment_url: input.values.attachment_url ?? null,
            payment_method: "credito",
            expense_type: "variavel",
            status: "paid",
          })
          .select("id")
          .single();
        if (error) throw error;
        transactionId = data.id;
      }

      const { error } = await supabase
        .from("fuel_entries")
        .insert({ ...input.values, user_id: user.id, transaction_id: transactionId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useDeleteFuelEntry() {
  const refresh = useRefreshFleet();
  return useMutation({
    mutationFn: async (entry: FuelEntry) => {
      const { error } = await supabase.from("fuel_entries").delete().eq("id", entry.id);
      if (error) throw error;
      if (entry.transaction_id) {
        await supabase
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.transaction_id);
      }
    },
    onSuccess: refresh,
  });
}

/* -------------------------------------------------------------------------- */
/* Cálculos                                                                    */
/* -------------------------------------------------------------------------- */

export type OdometerCheck = { ok: true } | { ok: false; message: string };

/**
 * Valida o odômetro informado contra o histórico do veículo.
 * O valor precisa ser maior que o último registro anterior à data e menor que o
 * próximo registro posterior, além de respeitar o odômetro inicial do veículo.
 */
export function validateOdometer(
  odometer: number,
  entryDate: string,
  vehicle: Vehicle | undefined,
  entries: FuelEntry[],
  ignoreId?: string,
): OdometerCheck {
  if (!Number.isFinite(odometer) || odometer <= 0) {
    return { ok: false, message: "Informe a quilometragem do painel." };
  }
  if (vehicle && odometer < Number(vehicle.initial_odometer ?? 0)) {
    return {
      ok: false,
      message: `A quilometragem não pode ser menor que a inicial (${vehicle.initial_odometer} km).`,
    };
  }

  const history = entries
    .filter((entry) => entry.id !== ignoreId)
    .slice()
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || Number(a.odometer) - Number(b.odometer));

  const previous = [...history].reverse().find((entry) => entry.entry_date <= entryDate);
  const next = history.find((entry) => entry.entry_date > entryDate);

  if (previous && odometer <= Number(previous.odometer)) {
    return {
      ok: false,
      message: `A quilometragem deve ser maior que ${previous.odometer} km (último abastecimento).`,
    };
  }
  if (next && odometer >= Number(next.odometer)) {
    return {
      ok: false,
      message: `A quilometragem deve ser menor que ${next.odometer} km (abastecimento seguinte).`,
    };
  }
  if (previous && odometer - Number(previous.odometer) > 20_000) {
    return { ok: false, message: "Diferença de quilometragem muito alta. Confira o valor." };
  }
  return { ok: true };
}

/**
 * Avisos não bloqueantes sobre um abastecimento: variações fora do padrão que
 * merecem uma segunda conferência antes de salvar.
 */
export function odometerWarnings(
  odometer: number,
  liters: number,
  entryDate: string,
  vehicle: Vehicle | undefined,
  entries: FuelEntry[],
  ignoreId?: string,
): string[] {
  const warnings: string[] = [];
  if (!Number.isFinite(odometer)) return warnings;

  const previous = entries
    .filter((entry) => entry.id !== ignoreId && entry.entry_date <= entryDate)
    .slice()
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || Number(b.odometer) - Number(a.odometer))
    .find((entry) => Number(entry.odometer) < odometer);

  if (previous) {
    const distance = odometer - Number(previous.odometer);
    if (distance < 5) {
      warnings.push(
        `Apenas ${round(distance, 1)} km desde o último abastecimento. Confira o odômetro.`,
      );
    }
    if (distance > 3000) {
      warnings.push(
        `Variação alta: ${round(distance, 1)} km desde o último abastecimento.`,
      );
    }
    if (Number.isFinite(liters) && liters > 0 && distance > 0) {
      const consumption = distance / liters;
      if (consumption > 40) {
        warnings.push(`Consumo calculado muito alto (${round(consumption, 1)} km/l).`);
      }
      if (consumption < 3) {
        warnings.push(`Consumo calculado muito baixo (${round(consumption, 1)} km/l).`);
      }
      const reference = Number(vehicle?.average_consumption ?? 0);
      if (reference > 0 && Math.abs(consumption - reference) / reference > 0.4) {
        warnings.push(
          `Consumo ${round(consumption, 1)} km/l está longe da média cadastrada (${reference} km/l).`,
        );
      }
    }
  }

  const tank = Number(vehicle?.tank_capacity ?? 0);
  if (tank > 0 && Number.isFinite(liters) && liters > tank * 1.1) {
    warnings.push(`Litros acima da capacidade do tanque (${tank} L).`);
  }

  return warnings;
}


/** Distância, consumo (km/l) e custo por km em relação ao abastecimento anterior. */
export function computeFuelMetrics(
  odometer: number,
  liters: number,
  totalAmount: number,
  entryDate: string,
  entries: FuelEntry[],
  ignoreId?: string,
) {
  const previous = entries
    .filter((entry) => entry.id !== ignoreId && entry.entry_date <= entryDate)
    .slice()
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || Number(b.odometer) - Number(a.odometer))
    .find((entry) => Number(entry.odometer) < odometer);

  if (!previous) return { distance: null, consumption: null, costPerKm: null };

  const distance = round(odometer - Number(previous.odometer), 1);
  if (distance <= 0 || liters <= 0) return { distance: null, consumption: null, costPerKm: null };

  return {
    distance,
    consumption: round(distance / liters, 2),
    costPerKm: round(totalAmount / distance, 3),
  };
}

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export type FuelSummary = {
  total: number;
  liters: number;
  entries: number;
  distance: number;
  averagePrice: number | null;
  averageConsumption: number | null;
  costPerKm: number | null;
  best: FuelEntry | null;
  worst: FuelEntry | null;
};

export function summarizeFuel(entries: FuelEntry[]): FuelSummary {
  const total = entries.reduce((sum, entry) => sum + Number(entry.total_amount), 0);
  const liters = entries.reduce((sum, entry) => sum + Number(entry.liters), 0);
  const distance = entries.reduce((sum, entry) => sum + Number(entry.distance ?? 0), 0);
  const withConsumption = entries.filter((entry) => entry.consumption != null);
  const averageConsumption = withConsumption.length
    ? round(
        withConsumption.reduce((sum, entry) => sum + Number(entry.consumption), 0) /
          withConsumption.length,
      )
    : null;
  const sorted = withConsumption
    .slice()
    .sort((a, b) => Number(b.consumption) - Number(a.consumption));

  return {
    total: round(total),
    liters: round(liters),
    entries: entries.length,
    distance: round(distance, 1),
    averagePrice: liters > 0 ? round(total / liters, 3) : null,
    averageConsumption,
    costPerKm: distance > 0 ? round(total / distance, 3) : null,
    best: sorted[0] ?? null,
    worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
  };
}

export type VehicleFuelStats = {
  vehicle: Vehicle;
  summary: FuelSummary;
  /** Meta de consumo configurada (ou média cadastrada do veículo). */
  target: number | null;
  /** Percentual de tolerância antes de disparar o alerta. */
  threshold: number;
  /** Consumo abaixo da meta além da tolerância configurada. */
  alert: boolean;
  /** Gasto acima do teto mensal configurado. */
  budgetAlert: boolean;
  /** Variação percentual em relação à meta. */
  deviation: number | null;
};

/** Agrupa os abastecimentos filtrados por veículo e calcula alertas de consumo. */
export function statsByVehicle(
  vehicles: Vehicle[],
  entries: FuelEntry[],
): VehicleFuelStats[] {
  return vehicles.map((vehicle) => {
    const own = entries.filter((entry) => entry.vehicle_id === vehicle.id);
    const summary = summarizeFuel(own);
    const target =
      Number(vehicle.target_consumption ?? 0) || Number(vehicle.average_consumption ?? 0) || null;
    const threshold = Math.max(1, Number(vehicle.alert_threshold ?? 10));
    const enabled = vehicle.alerts_enabled !== false;
    const deviation =
      target && summary.averageConsumption
        ? round(((summary.averageConsumption - target) / target) * 100, 1)
        : null;
    const budget = Number(vehicle.monthly_fuel_budget ?? 0);
    return {
      vehicle,
      summary,
      target,
      threshold,
      deviation,
      alert: enabled && deviation != null && deviation <= -threshold,
      budgetAlert: enabled && budget > 0 && summary.total > budget,
    };
  });
}

/** Gera o CSV do dashboard de combustível por veículo. */
export function fuelStatsCsv(
  stats: VehicleFuelStats[],
  period: { from?: string; to?: string } = {},
): string {
  const header = [
    "Veiculo",
    "Placa",
    "Periodo inicial",
    "Periodo final",
    "Abastecimentos",
    "Litros",
    "Distancia (km)",
    "Consumo medio (km/l)",
    "Meta (km/l)",
    "Variacao (%)",
    "Preco medio (R$/L)",
    "Custo por km (R$)",
    "Total no periodo (R$)",
    "Alerta",
  ];

  const rows = stats.map((item) =>
    [
      item.vehicle.name,
      item.vehicle.plate ?? "",
      period.from ?? "",
      period.to ?? "",
      item.summary.entries,
      item.summary.liters,
      item.summary.distance,
      item.summary.averageConsumption ?? "",
      item.target ?? "",
      item.deviation ?? "",
      item.summary.averagePrice ?? "",
      item.summary.costPerKm ?? "",
      item.summary.total,
      item.alert ? "Consumo abaixo da meta" : item.budgetAlert ? "Gasto acima do teto" : "",
    ]
      .map((value) => String(value).replace(/;/g, ","))
      .join(";"),
  );

  const totals = stats.reduce(
    (acc, item) => ({
      entries: acc.entries + item.summary.entries,
      liters: round(acc.liters + item.summary.liters, 2),
      distance: round(acc.distance + item.summary.distance, 1),
      total: round(acc.total + item.summary.total, 2),
    }),
    { entries: 0, liters: 0, distance: 0, total: 0 },
  );

  const totalRow = [
    "TOTAL",
    "",
    period.from ?? "",
    period.to ?? "",
    totals.entries,
    totals.liters,
    totals.distance,
    totals.distance > 0 && totals.liters > 0 ? round(totals.distance / totals.liters, 2) : "",
    "",
    "",
    totals.liters > 0 ? round(totals.total / totals.liters, 3) : "",
    totals.distance > 0 ? round(totals.total / totals.distance, 3) : "",
    totals.total,
    "",
  ].join(";");

  return [header.join(";"), ...rows, totalRow].join("\n");
}

export function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


export type VehicleAlertSettings = {
  target_consumption: number | null;
  alert_threshold: number;
  monthly_fuel_budget: number | null;
  alerts_enabled: boolean;
};

/** Salva metas e limites de alerta de um veículo. */
export function useSaveVehicleSettings() {
  const refresh = useRefreshFleet();
  return useMutation({
    mutationFn: async (input: { id: string; values: VehicleAlertSettings }) => {
      const { error } = await supabase.from("vehicles").update(input.values).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}
