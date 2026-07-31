import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;
type Category = Tables<"categories">;
type Vehicle = Tables<"vehicles">;

export type SpendSlice = { id: string; name: string; total: number; count: number };

export type VehicleSpend = {
  vehicle: Vehicle | null;
  vehicleName: string;
  vehicleType: string;
  total: number;
  count: number;
  categories: SpendSlice[];
  subCategories: SpendSlice[];
};

function push(map: Map<string, SpendSlice>, id: string, name: string, amount: number) {
  const current = map.get(id) ?? { id, name, total: 0, count: 0 };
  current.total += amount;
  current.count += 1;
  map.set(id, current);
}

const sortSlices = (slices: SpendSlice[]) => slices.sort((a, b) => b.total - a.total);

/**
 * Agrupa as despesas vinculadas a veículos por veículo, categoria e subcategoria.
 */
export function vehicleSpendBreakdown(
  transactions: Transaction[],
  vehicles: Vehicle[],
  categories: Category[],
): VehicleSpend[] {
  const catById = new Map(categories.map((category) => [category.id, category]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const groups = new Map<
    string,
    { total: number; count: number; cats: Map<string, SpendSlice>; subs: Map<string, SpendSlice> }
  >();

  for (const row of transactions) {
    if (row.transaction_type !== "expense" || !row.vehicle_id) continue;
    const amount = Number(row.amount);
    const key = row.vehicle_id;
    const group =
      groups.get(key) ?? { total: 0, count: 0, cats: new Map(), subs: new Map() };
    group.total += amount;
    group.count += 1;

    const category = row.category_id ? catById.get(row.category_id) : undefined;
    push(group.cats, category?.id ?? "sem-categoria", category?.name ?? "Sem categoria", amount);

    const sub = row.sub_category_id ? catById.get(row.sub_category_id) : undefined;
    push(group.subs, sub?.id ?? "sem-subcategoria", sub?.name ?? "Sem subcategoria", amount);

    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([vehicleId, group]) => {
      const vehicle = vehicleById.get(vehicleId) ?? null;
      return {
        vehicle,
        vehicleName: vehicle?.name ?? "Veículo removido",
        vehicleType: vehicle?.vehicle_type ?? "other",
        total: group.total,
        count: group.count,
        categories: sortSlices([...group.cats.values()]),
        subCategories: sortSlices([...group.subs.values()]),
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Soma por tipo de veículo (carro, moto, etc.). */
export function spendByVehicleType(rows: VehicleSpend[], typeLabel: (value: string) => string) {
  const map = new Map<string, SpendSlice>();
  for (const row of rows) {
    const label = typeLabel(row.vehicleType);
    const current = map.get(row.vehicleType) ?? { id: row.vehicleType, name: label, total: 0, count: 0 };
    current.total += row.total;
    current.count += row.count;
    map.set(row.vehicleType, current);
  }
  return sortSlices([...map.values()]);
}

/** CSV do relatório de gastos com veículo. */
export function vehicleSpendCsv(rows: VehicleSpend[], period: { from: string; to: string }) {
  const header = [
    "Veiculo",
    "Tipo",
    "Placa",
    "Periodo inicial",
    "Periodo final",
    "Categoria",
    "Subcategoria",
    "Lancamentos",
    "Total (R$)",
  ].join(";");

  const lines: string[] = [];
  for (const row of rows) {
    for (const category of row.categories) {
      lines.push(
        [
          row.vehicleName,
          row.vehicleType,
          row.vehicle?.plate ?? "",
          period.from,
          period.to,
          category.name,
          "",
          category.count,
          category.total.toFixed(2),
        ]
          .map((value) => String(value).replace(/;/g, ","))
          .join(";"),
      );
    }
    for (const sub of row.subCategories) {
      lines.push(
        [
          row.vehicleName,
          row.vehicleType,
          row.vehicle?.plate ?? "",
          period.from,
          period.to,
          "",
          sub.name,
          sub.count,
          sub.total.toFixed(2),
        ]
          .map((value) => String(value).replace(/;/g, ","))
          .join(";"),
      );
    }
  }

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  lines.push(["TOTAL", "", "", period.from, period.to, "", "", "", total.toFixed(2)].join(";"));

  return [header, ...lines].join("\n");
}
