import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toCents } from "@/lib/finance";

export type TransactionItem = Tables<"transaction_items">;

/** Unidades de medida aceitas ao detalhar uma compra. */
export const MEASURE_UNITS = [
  { value: "un", label: "Unidade (un)", weighted: false },
  { value: "kg", label: "Quilo (kg)", weighted: true },
  { value: "g", label: "Grama (g)", weighted: true },
  { value: "l", label: "Litro (L)", weighted: false },
  { value: "ml", label: "Mililitro (ml)", weighted: false },
  { value: "duzia", label: "Dúzia (dz)", weighted: false },
  { value: "pacote", label: "Pacote", weighted: false },
  { value: "caixa", label: "Caixa", weighted: false },
  { value: "fardo", label: "Fardo", weighted: false },
  { value: "bandeja", label: "Bandeja", weighted: true },
  { value: "maco", label: "Maço", weighted: false },
  { value: "saco", label: "Saco", weighted: true },
  { value: "conjunto", label: "Conjunto / feira", weighted: false },
] as const;

export type UnitValue = (typeof MEASURE_UNITS)[number]["value"];

export function unitLabel(value: string | null | undefined): string {
  if (!value) return "un";
  return MEASURE_UNITS.find((unit) => unit.value === value)?.label ?? value;
}

export function unitIsWeighted(value: string | null | undefined): boolean {
  return MEASURE_UNITS.find((unit) => unit.value === value)?.weighted ?? false;
}

/** Sugestões rápidas para agilizar o registro de itens no celular. */
export const ITEM_SUGGESTIONS = [
  { name: "Feira da semana", unit: "conjunto" as UnitValue },
  { name: "Pão", unit: "un" as UnitValue },
  { name: "Açaí", unit: "l" as UnitValue },
  { name: "Banana", unit: "kg" as UnitValue },
  { name: "Frutas variadas", unit: "kg" as UnitValue },
  { name: "Legumes", unit: "kg" as UnitValue },
  { name: "Verduras", unit: "maco" as UnitValue },
  { name: "Carne", unit: "kg" as UnitValue },
  { name: "Frango", unit: "kg" as UnitValue },
  { name: "Ovos", unit: "duzia" as UnitValue },
  { name: "Arroz", unit: "pacote" as UnitValue },
  { name: "Água mineral", unit: "fardo" as UnitValue },
  { name: "Gás de cozinha", unit: "un" as UnitValue },
] as const;

/** Formato usado no formulário antes de gravar. */
export type ItemDraft = {
  id?: string;
  name: string;
  unit: string;
  quantity: string;
  weight: string;
  unitPrice: string;
  total: string;
  notes: string;
};

export function emptyItem(unit: UnitValue = "un"): ItemDraft {
  return { name: "", unit, quantity: "1", weight: "", unitPrice: "", total: "", notes: "" };
}

export function itemFromRow(row: TransactionItem): ItemDraft {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    quantity: String(row.quantity ?? 1).replace(".", ","),
    weight: row.weight === null ? "" : String(row.weight).replace(".", ","),
    unitPrice: row.unit_price === null ? "" : String(row.unit_price).replace(".", ","),
    total: String(row.total_amount ?? 0).replace(".", ","),
    notes: row.notes ?? "",
  };
}

export function itemsTotal(items: ItemDraft[]): number {
  return toCents(
    items.reduce((sum, item) => {
      const value = Number(item.total.replace(",", "."));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0),
  );
}

export function useTransactionItems(transactionId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transaction-items", transactionId],
    enabled: Boolean(user?.id && transactionId),
    queryFn: async (): Promise<TransactionItem[]> => {
      const { data, error } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transactionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Regrava a lista de itens de um lançamento (substitui tudo). */
export function useSaveTransactionItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, items }: { transactionId: string; items: ItemDraft[] }) => {
      if (!user) throw new Error("Sessão expirada");

      const { error: deleteError } = await supabase
        .from("transaction_items")
        .delete()
        .eq("transaction_id", transactionId);
      if (deleteError) throw deleteError;

      const rows = items
        .filter((item) => item.name.trim().length > 0)
        .map((item) => {
          const numeric = (raw: string) => {
            const value = Number(raw.replace(",", "."));
            return Number.isFinite(value) ? value : null;
          };
          return {
            user_id: user.id,
            transaction_id: transactionId,
            name: item.name.trim().slice(0, 120),
            unit: item.unit,
            quantity: numeric(item.quantity) ?? 1,
            weight: numeric(item.weight),
            unit_price: numeric(item.unitPrice),
            total_amount: numeric(item.total) ?? 0,
            notes: item.notes.trim() ? item.notes.trim().slice(0, 200) : null,
          };
        });

      if (rows.length > 0) {
        const { error } = await supabase.from("transaction_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["transaction-items", variables.transactionId] });
    },
  });
}

function num(raw: string): number {
  const value = Number(String(raw).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export type ItemIssue = { index: number; message: string };

/**
 * Valida a lista de itens: cada linha deve fechar quantidade x valor unitário
 * e a soma dos itens deve bater com o valor total do gasto.
 */
export function validatePurchaseItems(items: ItemDraft[], amount: number) {
  const filled = items.filter((item) => item.name.trim().length > 0);
  const issues: ItemIssue[] = [];

  items.forEach((item, index) => {
    if (!item.name.trim()) {
      if (item.total.trim() || item.unitPrice.trim()) {
        issues.push({ index, message: "Informe o nome do produto." });
      }
      return;
    }
    const quantity = num(item.quantity);
    const unitPrice = num(item.unitPrice);
    const total = num(item.total);

    if (quantity <= 0) {
      issues.push({ index, message: "Quantidade deve ser maior que zero." });
      return;
    }
    if (total <= 0) {
      issues.push({ index, message: "Informe o valor total do item." });
      return;
    }
    if (unitPrice > 0) {
      const expected = toCents(quantity * unitPrice);
      if (Math.abs(expected - total) > 0.02) {
        issues.push({
          index,
          message: `Quantidade x valor unitário resulta em ${expected
            .toFixed(2)
            .replace(".", ",")}, diferente do total informado.`,
        });
      }
    }
  });

  const total = itemsTotal(items);
  const diff = toCents(total - toCents(amount));
  const hasItems = filled.length > 0;
  const totalMismatch = hasItems && Math.abs(diff) > 0.02;

  return { issues, total, diff, hasItems, totalMismatch, valid: issues.length === 0 && !totalMismatch };
}
