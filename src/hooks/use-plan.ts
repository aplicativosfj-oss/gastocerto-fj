import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

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
