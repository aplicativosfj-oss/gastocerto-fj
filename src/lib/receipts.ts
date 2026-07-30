import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { removeReceipt } from "@/lib/storage";

export type ReceiptItem = {
  id: string;
  origin: "transaction" | "fuel";
  path: string;
  title: string;
  date: string;
  amount: number;
};

/** Todos os comprovantes anexados a lançamentos e abastecimentos. */
export function useReceipts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["receipts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ReceiptItem[]> => {
      const [transactions, fuel] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, description, transaction_date, amount, attachment_url")
          .not("attachment_url", "is", null)
          .is("deleted_at", null)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("fuel_entries")
          .select("id, station, entry_date, total_amount, attachment_url")
          .not("attachment_url", "is", null)
          .order("entry_date", { ascending: false }),
      ]);

      if (transactions.error) throw transactions.error;
      if (fuel.error) throw fuel.error;

      const items: ReceiptItem[] = [
        ...(transactions.data ?? []).map((row) => ({
          id: row.id,
          origin: "transaction" as const,
          path: row.attachment_url as string,
          title: row.description,
          date: row.transaction_date,
          amount: Number(row.amount),
        })),
        ...(fuel.data ?? []).map((row) => ({
          id: row.id,
          origin: "fuel" as const,
          path: row.attachment_url as string,
          title: row.station ? `Abastecimento — ${row.station}` : "Abastecimento",
          date: row.entry_date,
          amount: Number(row.total_amount),
        })),
      ];

      return items.sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

/** Remove o arquivo do armazenamento e desvincula do registro de origem. */
export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ReceiptItem) => {
      const table = item.origin === "fuel" ? "fuel_entries" : "transactions";
      const { error } = await supabase
        .from(table)
        .update({ attachment_url: null })
        .eq("id", item.id);
      if (error) throw error;
      await removeReceipt(item.path);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["receipts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["fuel-entries"] }),
      ]);
    },
  });
}
