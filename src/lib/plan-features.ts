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

export type PlanAccessInput = {
  planSlug?: string | null;
  planTier?: string | null;
  planPrice?: number | string | null;
  trialEndsAt?: string | Date | null;
  /** Slug do plano de teste em vigor (testes de cortesia são limitados e sem IA). */
  trialPlanSlug?: string | null;
  hasPaidLicense?: boolean | null;
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
  features: FeatureKey[];
  locked: FeatureKey[];
  freeTransactionLimit: number | null;
};

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

  // A IA integrada acompanha somente o plano Premium IA (ou teste completo,
  // admin ou licença paga). Testes de cortesia nunca liberam a IA.
  const aiIncluded =
    isAdmin ||
    input.hasPaidLicense === true ||
    (tier === "trial" ? !courtesyTrial : planIncludesAi(planSlug));

  const features =
    tier === "free"
      ? FREE_FEATURES
      : courtesyTrial
        ? TRIAL_BASIC_FEATURES
        : aiIncluded
          ? ALL_FEATURES
          : ALL_FEATURES.filter((feature) => feature !== "ai_advisor");

  return {
    tier,
    planSlug,
    isAdmin,
    aiIncluded,
    trialActive: tier === "trial",
    courtesyTrial,
    trialDaysLeft,
    trialEndsAt: trialEnd ? trialEnd.toISOString() : null,
    features,
    locked: ALL_FEATURES.filter((feature) => !features.includes(feature)),
    freeTransactionLimit: tier === "free" ? FREE_MONTHLY_TRANSACTION_LIMIT : null,
  };
}

export function hasFeature(access: PlanAccess | null | undefined, feature: FeatureKey): boolean {
  if (!access) return false;
  return access.features.includes(feature);
}
