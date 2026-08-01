/**
 * Regras de plano do GastoCerto — função pura, testável e compartilhada entre
 * cliente e servidor.
 *
 * Níveis:
 * - `free`   → plano gratuito, apenas alguns recursos liberados (isca/curiosidade).
 * - `trial`  → teste de 7, 15 ou 30 dias com TUDO liberado enquanto vigente.
 * - `paid`   → assinatura ativa (licença paga ou plano com preço).
 */

import { planIncludesAi, trialIncludesAi } from "./ai-entitlement";

export type PlanTier = "free" | "trial" | "paid";

export type FeatureKey =
  | "dashboard"
  | "transactions"
  | "categories"
  | "monthly_balance"
  | "budgets"
  | "goals"
  | "recurring"
  | "commitments"
  | "vehicles"
  | "fuel"
  | "reports_advanced"
  | "exports"
  | "receipts"
  | "notifications"
  | "ai_advisor"
  | "unlimited_transactions";

/** Recursos liberados no plano gratuito (o resto fica visível, mas bloqueado). */
export const FREE_FEATURES: FeatureKey[] = [
  "dashboard",
  "transactions",
  "categories",
  "monthly_balance",
];

export const ALL_FEATURES: FeatureKey[] = [
  "dashboard",
  "transactions",
  "categories",
  "monthly_balance",
  "budgets",
  "goals",
  "recurring",
  "commitments",
  "vehicles",
  "fuel",
  "reports_advanced",
  "exports",
  "receipts",
  "notifications",
  "ai_advisor",
  "unlimited_transactions",
];

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  dashboard: "Painel mensal",
  transactions: "Lançamentos",
  categories: "Categorias",
  monthly_balance: "Balancete do mês",
  budgets: "Orçamentos por categoria",
  goals: "Metas e progresso",
  recurring: "Despesas recorrentes",
  commitments: "Compromissos, parcelas e fiados",
  vehicles: "Cadastro de veículos",
  fuel: "Combustível e custo por km",
  reports_advanced: "Relatórios avançados",
  exports: "Exportação em CSV e PDF",
  receipts: "Comprovantes anexados",
  notifications: "Alertas e notificações",
  ai_advisor: "Consultor de IA",
  unlimited_transactions: "Lançamentos ilimitados",
};

/**
 * Recursos liberados nas licenças de teste de cortesia (7 dias): um pouco mais
 * que o gratuito, mas sem IA, sem relatórios avançados e sem exportações.
 */
export const TRIAL_BASIC_FEATURES: FeatureKey[] = [
  "dashboard",
  "transactions",
  "categories",
  "monthly_balance",
  "budgets",
  "goals",
  "recurring",
  "notifications",
];

/** Limite de lançamentos por mês no plano gratuito. */
export const FREE_MONTHLY_TRANSACTION_LIMIT = 30;

export const TRIAL_OPTIONS = [
  { slug: "trial_7", days: 7, label: "7 dias" },
  { slug: "trial_15", days: 15, label: "15 dias" },
  { slug: "trial_30", days: 30, label: "30 dias" },
] as const;

export type TrialSlug = (typeof TRIAL_OPTIONS)[number]["slug"];

export function trialDaysForSlug(slug: string | null | undefined): number | null {
  const found = TRIAL_OPTIONS.find((option) => option.slug === slug);
  return found ? found.days : null;
}

/** Cotas de uso por nível de plano — diferenciam Premium de Premium IA. */
export type PlanLimits = {
  /** Lançamentos por mês (`null` = ilimitado). */
  monthlyTransactions: number | null;
  /** Veículos cadastrados (`null` = ilimitado). */
  vehicles: number | null;
  /** Links compartilhados ativos (`null` = ilimitado). */
  shareLinks: number | null;
  /** Metas ativas (`null` = ilimitado). */
  goals: number | null;
  /** Meses de histórico consultáveis (`null` = completo). */
  historyMonths: number | null;
  /** Consultas de IA por mês (0 = IA bloqueada). */
  aiQueries: number;
};

export const FREE_LIMITS: PlanLimits = {
  monthlyTransactions: FREE_MONTHLY_TRANSACTION_LIMIT,
  vehicles: 1,
  shareLinks: 0,
  goals: 1,
  historyMonths: 3,
  aiQueries: 0,
};

/** Premium: uso amplo, porém com cotas — a IA fica no plano superior. */
export const PREMIUM_LIMITS: PlanLimits = {
  monthlyTransactions: null,
  vehicles: 2,
  shareLinks: 2,
  goals: 5,
  historyMonths: 24,
  aiQueries: 0,
};

/** Premium IA: sem cotas + Consultor de IA com créditos mensais. */
export const PREMIUM_AI_LIMITS: PlanLimits = {
  monthlyTransactions: null,
  vehicles: null,
  shareLinks: null,
  goals: null,
  historyMonths: null,
  aiQueries: 120,
};

export const TRIAL_LIMITS: PlanLimits = { ...PREMIUM_AI_LIMITS, aiQueries: 20 };
export const COURTESY_TRIAL_LIMITS: PlanLimits = {
  ...PREMIUM_LIMITS,
  vehicles: 1,
  shareLinks: 0,
  goals: 2,
  historyMonths: 6,
  aiQueries: 0,
};

export type PlanAccessInput = {
  planSlug?: string | null;
  planTier?: string | null;
  planPrice?: number | string | null;
  trialEndsAt?: string | Date | null;
  /** Slug do plano de teste em vigor (testes de cortesia são limitados e sem IA). */
  trialPlanSlug?: string | null;
  hasPaidLicense?: boolean | null;
  /** Slug do plano da licença paga vigente (define se a IA está inclusa). */
  paidPlanSlug?: string | null;
  isAdmin?: boolean | null;
  now?: Date;
};

export type PlanAccess = {
  tier: PlanTier;
  planSlug: string;
  isAdmin: boolean;
  /** Verdadeiro quando o plano atual inclui o Consultor de IA. */
  aiIncluded: boolean;
  trialActive: boolean;
  /** Teste de cortesia de 7 dias: recursos limitados e IA bloqueada. */
  courtesyTrial: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  /**
   * Conta somente-leitura: o período de teste/licença venceu e não há plano
   * pago. Nenhum lançamento pode ser criado, editado ou excluído até a compra.
   */
  readOnly: boolean;
  readOnlyReason: string | null;
  features: FeatureKey[];
  locked: FeatureKey[];
  freeTransactionLimit: number | null;
  /** Cotas de uso do plano vigente. */
  limits: PlanLimits;
};

export const READ_ONLY_MESSAGE =
  "Seu período de teste venceu. A conta está em modo somente leitura: você continua consultando os dados, mas para inserir ou editar lançamentos é necessário ativar uma nova licença ou assinar um plano.";


export function resolvePlanAccess(input: PlanAccessInput): PlanAccess {
  const now = input.now ?? new Date();
  const planSlug = String(input.planSlug ?? "free").toLowerCase();
  const isAdmin = input.isAdmin === true;

  const trialEnd = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
  const trialValid = Boolean(trialEnd && trialEnd.getTime() > now.getTime());
  const trialDaysLeft = trialValid
    ? Math.max(1, Math.ceil(((trialEnd as Date).getTime() - now.getTime()) / 86_400_000))
    : 0;

  const price = Number(input.planPrice ?? 0);
  const paid =
    isAdmin ||
    input.hasPaidLicense === true ||
    String(input.planTier ?? "").toLowerCase() === "paid" ||
    (price > 0 && planSlug !== "free");

  const tier: PlanTier = paid ? "paid" : trialValid ? "trial" : "free";

  const trialSlug = String(input.trialPlanSlug ?? "").toLowerCase();
  // Teste de cortesia (licença de 7 dias doada pelo admin): recursos limitados.
  const courtesyTrial =
    tier === "trial" && (!trialIncludesAi(trialSlug) || !trialIncludesAi(planSlug));

  // Slug efetivo do plano pago: prioriza a licença paga vigente.
  const paidSlug = String(input.paidPlanSlug ?? "").toLowerCase() || planSlug;
  // Licença antiga sem plano identificado: mantém tudo liberado por compatibilidade.
  const legacyPaidLicense =
    input.hasPaidLicense === true && (!paidSlug || paidSlug === "free");

  // A IA integrada acompanha somente o plano Premium IA (ou teste completo e admin).
  const aiIncluded =
    isAdmin ||
    legacyPaidLicense ||
    (tier === "trial" ? !courtesyTrial : planIncludesAi(paidSlug));

  const features =
    tier === "free"
      ? FREE_FEATURES
      : courtesyTrial
        ? TRIAL_BASIC_FEATURES
        : aiIncluded
          ? ALL_FEATURES
          : ALL_FEATURES.filter((feature) => feature !== "ai_advisor");

  const limits: PlanLimits =
    isAdmin || legacyPaidLicense
      ? PREMIUM_AI_LIMITS
      : tier === "free"
        ? FREE_LIMITS
        : tier === "trial"
          ? courtesyTrial
            ? COURTESY_TRIAL_LIMITS
            : TRIAL_LIMITS
          : aiIncluded
            ? PREMIUM_AI_LIMITS
            : PREMIUM_LIMITS;

  // Vencimento do teste/licença: a conta fica somente leitura até a compra.
  const trialExpired = Boolean(trialEnd && !trialValid);
  const readOnly = !paid && trialExpired;

  return {
    tier,
    planSlug,
    isAdmin,
    aiIncluded,
    trialActive: tier === "trial",
    courtesyTrial,
    trialDaysLeft,
    trialEndsAt: trialEnd ? trialEnd.toISOString() : null,
    readOnly,
    readOnlyReason: readOnly ? READ_ONLY_MESSAGE : null,
    features,
    locked: ALL_FEATURES.filter((feature) => !features.includes(feature)),
    freeTransactionLimit: tier === "free" ? FREE_MONTHLY_TRANSACTION_LIMIT : null,
    limits,
  };
}

/** Cota do plano para um recurso, ou `null` quando ilimitada. */
export function limitFor(
  access: PlanAccess | null | undefined,
  key: keyof PlanLimits,
): number | null {
  if (!access) return null;
  return access.limits[key];
}

/** Verdadeiro quando ainda há espaço na cota do plano. */
export function withinLimit(
  access: PlanAccess | null | undefined,
  key: keyof PlanLimits,
  currentCount: number,
): boolean {
  const limit = limitFor(access, key);
  if (limit === null) return true;
  return currentCount < limit;
}


/** Verdadeiro quando a conta pode criar/editar/excluir dados. */
export function canWrite(access: PlanAccess | null | undefined): boolean {
  if (!access) return true;
  return !access.readOnly;
}


export function hasFeature(access: PlanAccess | null | undefined, feature: FeatureKey): boolean {
  if (!access) return false;
  return access.features.includes(feature);
}
