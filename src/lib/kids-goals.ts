import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type KidsSavingsGoal = {
  id: string;
  dependent_id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  reward: string | null;
  completed_at: string | null;
  redeemed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Metas de poupança do Espaço Kids. Sem `dependent_id` traz todas do responsável. */
export function useKidsSavingsGoals(dependent_id?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kids_savings_goals", user?.id, dependent_id ?? "all"],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<KidsSavingsGoal[]> => {
      let query = supabase
        .from("kids_savings_goals" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (dependent_id) query = query.eq("dependent_id", dependent_id);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as KidsSavingsGoal[];
    },
  });
}

export function useSaveKidsGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; values: Partial<KidsSavingsGoal> }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("kids_savings_goals" as any)
          .update(input.values as any)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("kids_savings_goals" as any)
        .insert({ ...input.values, user_id: user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kids_savings_goals"] });
    },
  });
}

/**
 * Guarda moedinhas na meta. Quando o valor alcança o objetivo, marca a
 * conquista (`completed_at`) para o responsável liberar a recompensa.
 */
export function useContributeKidsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goal: KidsSavingsGoal; amount: number }) => {
      const next = Math.max(0, Number(input.goal.current_amount) + input.amount);
      const reached = next >= Number(input.goal.target_amount) && Number(input.goal.target_amount) > 0;
      const { error } = await supabase
        .from("kids_savings_goals" as any)
        .update({
          current_amount: next,
          completed_at: reached ? (input.goal.completed_at ?? new Date().toISOString()) : null,
          ...(reached ? {} : { redeemed_at: null }),
        } as any)
        .eq("id", input.goal.id);
      if (error) throw error;
      return { reached, next };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kids_savings_goals"] });
    },
  });
}

/** Resgate da recompensa: o responsável confirma a entrega do prêmio. */
export function useRedeemKidsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; undo?: boolean }) => {
      const { error } = await supabase
        .from("kids_savings_goals" as any)
        .update({ redeemed_at: input.undo ? null : new Date().toISOString() } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kids_savings_goals"] });
    },
  });
}

export function useDeleteKidsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kids_savings_goals" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kids_savings_goals"] });
    },
  });
}
