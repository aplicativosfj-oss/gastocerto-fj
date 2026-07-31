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

/** Rate limiting por usuário (protege trial/teste de tentativas repetidas). */
export const AI_RATE_WINDOW_SECONDS = 60;
export const AI_RATE_MAX_IN_WINDOW = 5;
export const AI_RATE_BURST_WINDOW_SECONDS = 3600;
export const AI_RATE_MAX_IN_BURST_WINDOW = 30;
/** Alerta quando restam menos que esta fração dos créditos/consultas do mês. */
export const AI_LOW_CREDIT_RATIO = 0.2;

export const AI_RATE_MESSAGE =
  "Muitas tentativas em pouco tempo. Aguarde alguns instantes antes de pedir uma nova análise.";

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

export type AiRateVerdict = {
  allowed: boolean;
  retryAfterSeconds: number;
  windowCount: number;
  burstCount: number;
};

/**
 * Rate limiting puro: recebe os instantes das últimas tentativas (permitidas ou
 * bloqueadas) e decide se a nova execução pode seguir.
 */
export function evaluateAiRateLimit(
  attemptsIso: (string | Date)[],
  now: Date = new Date(),
): AiRateVerdict {
  const times = attemptsIso
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);

  const nowMs = now.getTime();
  const windowMs = AI_RATE_WINDOW_SECONDS * 1000;
  const burstMs = AI_RATE_BURST_WINDOW_SECONDS * 1000;

  const inWindow = times.filter((value) => nowMs - value < windowMs);
  const inBurst = times.filter((value) => nowMs - value < burstMs);

  if (inWindow.length >= AI_RATE_MAX_IN_WINDOW) {
    const oldest = inWindow[inWindow.length - 1] ?? nowMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000)),
      windowCount: inWindow.length,
      burstCount: inBurst.length,
    };
  }

  if (inBurst.length >= AI_RATE_MAX_IN_BURST_WINDOW) {
    const oldest = inBurst[inBurst.length - 1] ?? nowMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + burstMs - nowMs) / 1000)),
      windowCount: inWindow.length,
      burstCount: inBurst.length,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    windowCount: inWindow.length,
    burstCount: inBurst.length,
  };
}

/** Verdadeiro quando restam menos de 20% dos créditos ou das consultas do mês. */
export function isAiBalanceLow(input: {
  queries: number;
  queryLimit: number;
  credits: number;
  creditAllowance: number;
}): boolean {
  const queryRatio =
    input.queryLimit > 0 ? (input.queryLimit - input.queries) / input.queryLimit : 1;
  const creditRatio =
    input.creditAllowance > 0
      ? (input.creditAllowance - input.credits) / input.creditAllowance
      : 1;
  return Math.min(queryRatio, creditRatio) <= AI_LOW_CREDIT_RATIO;
}
