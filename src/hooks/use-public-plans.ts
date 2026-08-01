import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type PublicPlan = {
  slug: string;
  name: string;
  monthly_price: number;
  annual_price: number;
};

/**
 * Preços vigentes lidos do banco (planos ativos). Usado na landing e no
 * checkout para que qualquer ajuste feito pelo administrador apareça na hora.
 */
export function usePublicPlans() {
  return useQuery({
    queryKey: ["plans", "public"],
    staleTime: 30_000,
    queryFn: async (): Promise<PublicPlan[]> => {
      const { data, error } = await supabase
        .from("plans")
        .select("slug, name, monthly_price, annual_price")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        slug: String(row.slug),
        name: String(row.name),
        monthly_price: Number(row.monthly_price ?? 0),
        annual_price: Number(row.annual_price ?? 0),
      }));
    },
  });
}

/** Preço vigente de um plano, com fallback para o catálogo estático. */
export function livePrice(
  plans: PublicPlan[] | undefined,
  slug: string,
  fallback: { monthly: number; annual: number },
) {
  const found = plans?.find((plan) => plan.slug === slug);
  if (!found) return fallback;
  return {
    monthly: found.monthly_price > 0 ? found.monthly_price : fallback.monthly,
    annual: found.annual_price > 0 ? found.annual_price : fallback.annual,
  };
}
