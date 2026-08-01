/**
 * Regras de acesso à IA (Consultor). Função pura para poder ser testada
 * e reutilizada por qualquer server function/endpoint do Consultor.
 *
 * Regra de negócio: a IA é liberada para planos PAGOS e para períodos de
 * TESTE vigentes (7, 15 ou 30 dias, com tudo liberado). O plano gratuito e os
 * testes expirados nunca executam análise, pois cada consulta consome créditos.
 *
 * Os limites (rate limiting, cota mensal e threshold do alerta) são
 * configuráveis pelo administrador — veja `ai-limits.ts`.
 */

import { DEFAULT_AI_LIMITS, type AiLimits } from "./ai-limits";

export const AI_TRIAL_SOURCES = [
  "trial",
  "teste",
  "test",
  "demo",
  "cortesia",
  "gratis",
  "trial_gift",
];
export const AI_TRIAL_SLUGS = ["free", "gratuito", "gratis", "trial", "teste", "test", "demo"];

/** Planos pagos que incluem o Consultor de IA. */
export const AI_PLAN_SLUGS = ["premium_ia", "premium-ia", "premium_ai", "ia", "ai"];

/**
 * Testes de cortesia distribuídos pelo administrador (licenças de 7 dias):
 * recursos limitados e IA SEMPRE bloqueada, pois cada análise consome créditos.
 */
export const AI_BLOCKED_TRIAL_SLUGS = ["trial_7_basic", "trial_gift", "trial_7_gift"];

/** Falso quando o período de teste em vigor é um teste de cortesia sem IA. */
export function trialIncludesAi(trialPlanSlug?: string | null): boolean {
  const value = String(trialPlanSlug ?? "").toLowerCase();
  if (!value) return true;
  return !AI_BLOCKED_TRIAL_SLUGS.includes(value);
}

/** Verdadeiro quando o slug do plano corresponde a um plano com IA integrada. */
export function planIncludesAi(slug?: string | null): boolean {
  const value = String(slug ?? "").toLowerCase();
  if (!value) return false;
  if (AI_BLOCKED_TRIAL_SLUGS.includes(value)) return false;
  return AI_PLAN_SLUGS.includes(value) || /(^|[-_])(ia|ai)([-_]|$)/.test(value);
}


/** Limites mensais por assinante (usados no painel de créditos). */
export const AI_MONTHLY_QUERY_LIMIT = 120;
export const AI_MONTHLY_CREDIT_ALLOWANCE = 50;
/** Estimativa de créditos consumidos por 1.000 tokens processados. */
export const AI_CREDITS_PER_1K_TOKENS = 0.05;

export const AI_BLOCK_MESSAGE =
  "O consultor de IA está disponível no plano Premium IA e durante o período de teste. Seu acesso atual não inclui a IA, pois cada análise consome créditos. Ative um teste ou assine o Premium IA para liberar as análises personalizadas.";

export const AI_UPGRADE_MESSAGE =
  "Seu plano é pago, mas não inclui o Consultor de IA. Faça upgrade para o Premium IA para liberar as análises com inteligência artificial.";


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
  | "plan_without_ai"
  | "trial_active"
  | "trial_expired"
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
  /** Fim do período de teste do usuário (tudo liberado enquanto vigente). */
  trialEndsAt?: string | Date | null;
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
  if (paidPlan) {
    // A IA só acompanha o plano pago com IA integrada (Premium IA).
    if (planIncludesAi(planSlug)) return { entitled: true, reason: "paid_plan", planSlug };
    return {
      entitled: false,
      reason: "plan_without_ai",
      planSlug,
      message: AI_UPGRADE_MESSAGE,
    };
  }

  // Período de teste vigente: tudo liberado, inclusive a IA — exceto nos
  // testes de cortesia de 7 dias, que nunca liberam a IA.
  const trialEnd = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
  const trialSlug = String(input.trialPlanSlug ?? "").toLowerCase();
  if (trialEnd && Number.isFinite(trialEnd.getTime())) {
    if (trialEnd.getTime() > now.getTime()) {
      if (!trialIncludesAi(trialSlug)) {
        return {
          entitled: false,
          reason: "trial_without_ai",
          planSlug,
          message: AI_TRIAL_BLOCK_MESSAGE,
        };
      }
      return { entitled: true, reason: "trial_active", planSlug };
    }
    return { entitled: false, reason: "trial_expired", planSlug, message: AI_BLOCK_MESSAGE };
  }
  if (!trialIncludesAi(planSlug)) {
    return {
      entitled: false,
      reason: "trial_without_ai",
      planSlug,
      message: AI_TRIAL_BLOCK_MESSAGE,
    };
  }


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
  limits: AiLimits = DEFAULT_AI_LIMITS,
): AiRateVerdict {
  const times = attemptsIso
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);

  const nowMs = now.getTime();
  const windowMs = limits.rateWindowSeconds * 1000;
  const burstMs = limits.burstWindowSeconds * 1000;

  const inWindow = times.filter((value) => nowMs - value < windowMs);
  const inBurst = times.filter((value) => nowMs - value < burstMs);

  if (inWindow.length >= limits.rateMaxInWindow) {
    const oldest = inWindow[inWindow.length - 1] ?? nowMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000)),
      windowCount: inWindow.length,
      burstCount: inBurst.length,
    };
  }

  if (inBurst.length >= limits.rateMaxInBurstWindow) {
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

/** Verdadeiro quando restam menos que o threshold configurado (padrão 20%). */
export function isAiBalanceLow(input: {
  queries: number;
  queryLimit: number;
  credits: number;
  creditAllowance: number;
  lowCreditRatio?: number;
}): boolean {
  const queryRatio =
    input.queryLimit > 0 ? (input.queryLimit - input.queries) / input.queryLimit : 1;
  const creditRatio =
    input.creditAllowance > 0
      ? (input.creditAllowance - input.credits) / input.creditAllowance
      : 1;
  const ratio = input.lowCreditRatio ?? AI_LOW_CREDIT_RATIO;
  return Math.min(queryRatio, creditRatio) <= ratio;
}
