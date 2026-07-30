import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Goal = Tables<"goals">;
export type GoalContribution = Tables<"goal_contributions">;

export const GOAL_TYPES = [
  { value: "saving", label: "Economizar" },
  { value: "reduce_category", label: "Reduzir categoria" },
  { value: "debt", label: "Quitar dívida" },
  { value: "reserve", label: "Reserva de emergência" },
] as const;

export const GOAL_STATUS = [
  { value: "active", label: "Em andamento" },
  { value: "completed", label: "Concluída" },
  { value: "paused", label: "Pausada" },
] as const;

export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGoalContributions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goal_contributions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<GoalContribution[]> => {
      const { data, error } = await supabase
        .from("goal_contributions")
        .select("*")
        .order("contribution_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useRefreshGoals() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["goal_contributions"] }),
    ]);
  };
}

export function useSaveGoal() {
  const { user } = useAuth();
  const refresh = useRefreshGoals();
  return useMutation({
    mutationFn: async (input: { id?: string; values: Omit<TablesInsert<"goals">, "user_id"> }) => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("goals")
          .update(input.values as TablesUpdate<"goals">)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("goals").insert({ ...input.values, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useDeleteGoal() {
  const refresh = useRefreshGoals();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useAddContribution() {
  const { user } = useAuth();
  const refresh = useRefreshGoals();
  return useMutation({
    mutationFn: async (input: {
      goalId: string;
      amount: number;
      date: string;
      notes?: string;
      currentAmount: number;
    }) => {
      if (!user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("goal_contributions").insert({
        user_id: user.id,
        goal_id: input.goalId,
        amount: input.amount,
        contribution_date: input.date,
        notes: input.notes || null,
      });
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("goals")
        .update({ current_amount: input.currentAmount + input.amount })
        .eq("id", input.goalId);
      if (updateError) throw updateError;
    },
    onSuccess: refresh,
  });
}

export type GoalProgress = {
  percent: number;
  remaining: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  isComplete: boolean;
};

export function goalProgress(goal: Goal, today = new Date()): GoalProgress {
  const target = Number(goal.target_amount) || 0;
  const current = Number(goal.current_amount) || 0;
  const remaining = Math.max(0, target - current);
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  let monthsLeft: number | null = null;
  if (goal.target_date) {
    const end = new Date(`${goal.target_date}T00:00:00`);
    monthsLeft =
      (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
    if (end.getDate() >= today.getDate()) monthsLeft += 0;
    monthsLeft = Math.max(0, monthsLeft);
  }

  return {
    percent,
    remaining,
    monthsLeft,
    monthlyNeeded: monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : remaining || null,
    isComplete: target > 0 && current >= target,
  };
}
