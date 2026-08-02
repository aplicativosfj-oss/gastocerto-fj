import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// Tipagem forçada para evitar erros de build antes da regeneração dos tipos do Supabase
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
  created_at: string;
  updated_at: string;
};

export function useKidsSavingsGoals(dependent_id?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kids_savings_goals", user?.id, dependent_id],
    enabled: Boolean(user?.id && dependent_id),
    queryFn: async (): Promise<KidsSavingsGoal[]> => {
      const { data, error } = await supabase
        .from("kids_savings_goals" as any)
        .select("*")
        .eq("dependent_id", dependent_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
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
          .update(input.values)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("kids_savings_goals" as any)
        .insert({ ...input.values, user_id: user.id });
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

