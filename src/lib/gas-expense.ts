/**
 * Lançamento automático da troca de gás como despesa na categoria "Gás".
 *
 * Mantém valor, data e forma de pagamento sempre consistentes com o registro
 * do botijão: ao criar cria a despesa, ao editar atualiza a despesa vinculada
 * (ou cria uma nova se ela não existir mais).
 */

import { useCallback } from "react";

import { useCategories } from "@/lib/queries";
import { useSaveTransaction } from "@/lib/transactions";

export type GasExpenseInput = {
  refillDate: string;
  amount: number;
  supplier?: string | null;
  paymentMethod?: string | null;
  sizeKg?: number | null;
  transactionId?: string | null;
};

export function gasExpenseDescription(input: GasExpenseInput) {
  const size = input.sizeKg ? ` ${input.sizeKg}kg` : "";
  return `Botijão de gás${size}${input.supplier ? ` — ${input.supplier}` : ""}`;
}

/** Retorna uma função que garante a despesa vinculada e devolve o id da transação. */
export function useGasExpenseSync() {
  const saveTransaction = useSaveTransaction();
  const { data: categories } = useCategories();

  const gasCategoryId =
    (categories ?? []).find(
      (item) => item.type === "expense" && item.name.trim().toLowerCase() === "gás",
    )?.id ?? null;

  const sync = useCallback(
    async (input: GasExpenseInput): Promise<string | null> => {
      const values = {
        description: gasExpenseDescription(input),
        amount: input.amount,
        transaction_type: "expense" as const,
        transaction_date: input.refillDate,
        payment_date: input.refillDate,
        status: "paid" as const,
        payment_method: input.paymentMethod ?? null,
        category_id: gasCategoryId,
        tags: ["gas"],
      };

      if (input.transactionId) {
        const updated = await saveTransaction.mutateAsync({
          id: input.transactionId,
          values,
        });
        return updated?.id ?? input.transactionId;
      }

      const created = await saveTransaction.mutateAsync({ values });
      return created?.id ?? null;
    },
    [gasCategoryId, saveTransaction],
  );

  return { sync, gasCategoryId, isPending: saveTransaction.isPending };
}
