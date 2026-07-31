import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/format";
import type { ItemDraft, TransactionItem } from "@/lib/purchase-items";

export type PurchaseAuditRow = Tables<"purchase_audit_log">;

/** Uma alteração registrada: campo, valor anterior e novo valor. */
export type AuditChange = { field: string; label: string; before: string; after: string };

export const AUDIT_ACTIONS: Record<string, string> = {
  quick_edit: "Edição rápida da compra",
  items_update: "Itens da compra",
  create: "Compra criada",
};

function money(value: number) {
  return formatCurrency(value);
}

function itemSignature(item: ItemDraft) {
  const quantity = item.quantity?.trim() || "1";
  const unit = item.unit || "un";
  const weight = item.weight?.trim() ? ` · ${item.weight} kg` : "";
  const total = item.total?.trim() || "0";
  return `${quantity} ${unit}${weight} — R$ ${total}`;
}

/** Compara cabeçalho da compra + itens e devolve a lista de mudanças. */
export function buildPurchaseChanges(input: {
  before: { amount: number; merchant: string | null; paymentMethod: string | null };
  after: { amount: number; merchant: string | null; paymentMethod: string | null };
  itemsBefore: TransactionItem[];
  itemsAfter: ItemDraft[];
  itemFromRow: (row: TransactionItem) => ItemDraft;
}): AuditChange[] {
  const changes: AuditChange[] = [];

  if (Math.abs(input.before.amount - input.after.amount) > 0.001) {
    changes.push({
      field: "amount",
      label: "Valor total",
      before: money(input.before.amount),
      after: money(input.after.amount),
    });
  }
  if ((input.before.merchant ?? "") !== (input.after.merchant ?? "")) {
    changes.push({
      field: "merchant_name",
      label: "Estabelecimento",
      before: input.before.merchant ?? "—",
      after: input.after.merchant ?? "—",
    });
  }
  if ((input.before.paymentMethod ?? "") !== (input.after.paymentMethod ?? "")) {
    changes.push({
      field: "payment_method",
      label: "Forma de pagamento",
      before: input.before.paymentMethod ?? "—",
      after: input.after.paymentMethod ?? "—",
    });
  }

  const beforeMap = new Map<string, ItemDraft>();
  for (const row of input.itemsBefore) {
    beforeMap.set(row.name.trim().toLowerCase(), input.itemFromRow(row));
  }
  const afterList = input.itemsAfter.filter((item) => item.name.trim().length > 0);
  const afterMap = new Map(afterList.map((item) => [item.name.trim().toLowerCase(), item]));

  for (const [key, item] of afterMap) {
    const previous = beforeMap.get(key);
    if (!previous) {
      changes.push({
        field: `item:${key}`,
        label: `Item adicionado — ${item.name}`,
        before: "—",
        after: itemSignature(item),
      });
      continue;
    }
    const from = itemSignature(previous);
    const to = itemSignature(item);
    if (from !== to) {
      changes.push({ field: `item:${key}`, label: `Item — ${item.name}`, before: from, after: to });
    }
  }
  for (const [key, item] of beforeMap) {
    if (!afterMap.has(key)) {
      changes.push({
        field: `item:${key}`,
        label: `Item removido — ${item.name}`,
        before: itemSignature(item),
        after: "—",
      });
    }
  }

  return changes;
}

export function usePurchaseAudit(transactionId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["purchase-audit", transactionId],
    enabled: Boolean(user?.id && transactionId),
    queryFn: async (): Promise<PurchaseAuditRow[]> => {
      const { data, error } = await supabase
        .from("purchase_audit_log")
        .select("*")
        .eq("transaction_id", transactionId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLogPurchaseAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      transactionId: string;
      action: keyof typeof AUDIT_ACTIONS | string;
      actorName: string | null;
      changes: AuditChange[];
      notes?: string | null;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.changes.length === 0) return;
      const { error } = await supabase.from("purchase_audit_log").insert({
        user_id: user.id,
        transaction_id: input.transactionId,
        action: input.action,
        actor_name: input.actorName,
        source: "quick_edit",
        changes: input.changes,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["purchase-audit", variables.transactionId] });
    },
  });
}

export function readChanges(row: PurchaseAuditRow): AuditChange[] {
  const raw = row.changes;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is AuditChange =>
      Boolean(item) && typeof item === "object" && "label" in (item as object),
  );
}
