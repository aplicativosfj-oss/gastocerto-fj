import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type GasRefill = Tables<"gas_refills">;

export const GAS_SIZES = [
  { value: 13, label: "P13 — 13 kg (uso doméstico)" },
  { value: 8, label: "P8 — 8 kg" },
  { value: 5, label: "P5 — 5 kg" },
  { value: 20, label: "P20 — 20 kg" },
  { value: 45, label: "P45 — 45 kg" },
] as const;

/** Todas as trocas de botijão do usuário, da mais recente para a mais antiga. */
export function useGasRefills() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gas-refills", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<GasRefill[]> => {
      const { data, error } = await supabase
        .from("gas_refills")
        .select("*")
        .order("refill_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveGasRefill() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Omit<TablesInsert<"gas_refills">, "user_id">;
    }): Promise<string> => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase.from("gas_refills").update(input.values).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("gas_refills")
        .insert({ ...input.values, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gas-refills"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteGasRefill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gas_refills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gas-refills"] });
    },
  });
}
