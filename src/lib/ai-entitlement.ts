/**
 * Regras de acesso à IA (Consultor). Função pura para poder ser testada
 * e reutilizada por qualquer server function/endpoint do Consultor.
 *
 * Regra de negócio: apenas planos PAGOS usam a IA. Trial, teste, demo,
 * cortesia e plano gratuito nunca executam análise, pois cada consulta
 * consome créditos.
 */

export const AI_TRIAL_SOURCES = ["trial", "teste", "test", "demo", "cortesia", "gratis"];
export const AI_TRIAL_SLUGS = ["free", "gratuito", "gratis", "trial", "teste", "test", "demo"];

/** Limites mensais por assinante (usados no painel de créditos). */
export const AI_MONTHLY_QUERY_LIMIT = 120;
export const AI_MONTHLY_CREDIT_ALLOWANCE = 50;
/** Estimativa de créditos consumidos por 1.000 tokens processados. */
export const AI_CREDITS_PER_1K_TOKENS = 0.05;

export const AI_BLOCK_MESSAGE =
  "O consultor de IA está disponível apenas nos planos pagos. Períodos de teste (trial) e o plano gratuito não incluem a IA, pois cada análise consome créditos. Ative sua assinatura para liberar as análises personalizadas.";

export const AI_QUOTA_MESSAGE =
  "Você atingiu o limite mensal de consultas de IA do seu plano. O limite é renovado no início do próximo mês.";

export type AiLicenseInput = {
  status?: string | null;
  expires_at?: string | null;
  source?: string | null;
  amount?: number | string | null;
};

export type AiPlanInput = {
  slug?: string | null;
  monthly_price?: number | string | null;
  annual_price?: number | string | null;
} | null;

export type AiEntitlementReason =
  | "admin"
  | "paid_license"
  | "paid_plan"
  | "trial_plan"
  | "free_plan"
  | "no_plan";

export type AiEntitlement = {
  entitled: boolean;
  reason: AiEntitlementReason;
  planSlug: string;
  message?: string;
};

export function estimateAiCredits(totalTokens: number): number {
  const tokens = Number.isFinite(totalTokens) ? Math.max(0, totalTokens) : 0;
  return Number(((tokens / 1000) * AI_CREDITS_PER_1K_TOKENS).toFixed(4));
}

export function evaluateAiEntitlement(input: {
  licenses?: AiLicenseInput[] | null;
  plan?: AiPlanInput;
  isAdmin?: boolean | null;
  now?: Date;
}): AiEntitlement {
  const now = input.now ?? new Date();
  const planSlug = String(input.plan?.slug ?? "free").toLowerCase();

  const paidLicense = (input.licenses ?? []).some((license) => {
    const active = String(license.status ?? "").toLowerCase() === "active";
    const valid = !license.expires_at || new Date(license.expires_at).getTime() > now.getTime();
    const source = String(license.source ?? "").toLowerCase();
    const paid = Number(license.amount ?? 0) > 0 && !AI_TRIAL_SOURCES.includes(source);
    return active && valid && paid;
  });

  if (input.isAdmin === true) return { entitled: true, reason: "admin", planSlug };
  if (paidLicense) return { entitled: true, reason: "paid_license", planSlug };

  const price = Math.max(
    Number(input.plan?.monthly_price ?? 0),
    Number(input.plan?.annual_price ?? 0),
  );
  const paidPlan = price > 0 && !AI_TRIAL_SLUGS.includes(planSlug);
  if (paidPlan) return { entitled: true, reason: "paid_plan", planSlug };

  const reason: AiEntitlementReason = !input.plan
    ? "no_plan"
    : AI_TRIAL_SLUGS.includes(planSlug) && planSlug !== "free" && planSlug !== "gratuito"
      ? "trial_plan"
      : "free_plan";

  return { entitled: false, reason, planSlug, message: AI_BLOCK_MESSAGE };
}
