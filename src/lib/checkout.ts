/**
 * Catálogo de planos pagos usado no checkout transparente (Pix).
 * Os preços exibidos aqui são apenas para a interface — o valor cobrado
 * é sempre recalculado no servidor a partir da tabela `plans`.
 */
export type CheckoutCycle = "monthly" | "annual";

export type CheckoutPlan = {
  slug: "premium" | "premium_ia";
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  highlights: string[];
  recommended?: boolean;
};

export const CHECKOUT_PLANS: CheckoutPlan[] = [
  {
    slug: "premium",
    name: "Premium",
    tagline: "Controle completo, sem limite de lançamentos.",
    monthly: 24.9,
    annual: 249,
    highlights: [
      "Lançamentos ilimitados e até 2 veículos",
      "Orçamentos, metas e compromissos",
      "Combustível com custo por quilômetro",
      "Exportação em CSV e PDF",
    ],
  },
  {
    slug: "premium_ia",
    name: "Premium IA",
    tagline: "Tudo do Premium com o Consultor de IA liberado.",
    monthly: 34.9,
    annual: 349,
    recommended: true,
    highlights: [
      "Tudo do Premium, sem cotas",
      "Veículos, metas e links ilimitados",
      "Consultor de IA analisando seus gastos",
      "Créditos mensais de IA inclusos",
      "Recibos e auditoria de cada análise",
    ],
  },
];

export function planBySlug(slug: string) {
  return CHECKOUT_PLANS.find((plan) => plan.slug === slug) ?? CHECKOUT_PLANS[0];
}

export function checkoutPrice(plan: CheckoutPlan, cycle: CheckoutCycle) {
  return cycle === "annual" ? plan.annual : plan.monthly;
}

export const CHECKOUT_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  in_process: "Em análise",
  approved: "Pagamento aprovado",
  rejected: "Pagamento recusado",
  cancelled: "Pagamento cancelado",
  expired: "Pix expirado",
};
