import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type KidsSavingsGoal = Tables<"kids_savings_goals">;

export function useKidsSavingsGoals(dependentId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kids_savings_goals", user?.id, dependentId],
    enabled: Boolean(user?.id && dependentId),
    queryFn: async (): Promise<KidsSavingsGoal[]> => {
      const { data, error } = await supabase
        .from("kids_savings_goals")
        .select("*")
        .eq("dependent_id", dependentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveKidsGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; values: Omit<TablesInsert<"kids_savings_goals">, "user_id"> }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("kids_savings_goals")
          .update(input.values as TablesUpdate<"kids_savings_goals">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("kids_savings_goals").insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["kids_savings_goals"] });
    },
  });
}

export function useDeleteKidsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kids_savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kids_savings_goals"] });
    },
  });
}
