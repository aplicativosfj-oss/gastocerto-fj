import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getPlanAccess } from "@/lib/plan.functions";
import { hasFeature, type FeatureKey } from "@/lib/plan-features";

/** Plano, nível e período de teste do usuário logado (cacheado). */
export function usePlanAccess() {
  const load = useServerFn(getPlanAccess);
  return useQuery({
    queryKey: ["plan-access"],
    queryFn: () => load({ data: undefined }),
    staleTime: 60_000,
  });
}

/**
 * Sincroniza em tempo real a liberação do plano: quando o administrador ativa a
 * licença anual ou troca o plano, a IA e os recursos premium liberam na hora,
 * sem o usuário precisar recarregar a página.
 */
export function usePlanRealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["plan-access"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["my-license"] });
      void queryClient.invalidateQueries({ queryKey: ["my-plan-audit"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-entitlement"] });
    };

    const channel = supabase
      .channel(`plan-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "licenses", filter: `user_id=eq.${user.id}` },
        refresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}

/** Verdadeiro quando o recurso está liberado no plano atual. */
export function useFeature(feature: FeatureKey) {
  const query = usePlanAccess();
  return {
    ...query,
    enabled: query.data ? hasFeature(query.data, feature) : true,
    tier: query.data?.tier ?? "paid",
    trialDaysLeft: query.data?.trialDaysLeft ?? 0,
  };
}
