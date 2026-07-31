import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Account = Tables<"accounts">;

/** Tipos de conta que o cliente pode cadastrar (bancos, carteiras e cartões). */
export const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
  { value: "wallet", label: "Dinheiro / carteira" },
  { value: "digital", label: "Banco digital" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "benefit", label: "Cartão de benefício" },
  { value: "other", label: "Outra" },
] as const;

export function useSaveAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Omit<TablesInsert<"accounts">, "user_id">;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase.from("accounts").update(input.values).eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("accounts")
        .insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

/** Desativa a conta preservando o histórico dos lançamentos já vinculados. */
export function useArchiveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
