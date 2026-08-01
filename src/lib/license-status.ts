/**
 * Situação detalhada de uma licença — função pura usada no painel do admin e
 * nas validações de backend.
 *
 * Regras de negócio:
 * - Licença de teste de cortesia (7 dias, valor zero, plano `trial_7_basic`):
 *   recursos limitados, IA SEMPRE bloqueada e validade que só começa a contar
 *   quando o cliente ativa a chave no site/app.
 * - Licença paga (mensal/anual): libera todos os recursos; a IA depende do
 *   plano contratado (Premium IA).
 */

import { planIncludesAi } from "./ai-entitlement";
import {
  ALL_FEATURES,
  FEATURE_LABEL,
  FREE_FEATURES,
  TRIAL_BASIC_FEATURES,
  type FeatureKey,
} from "./plan-features";

export const TRIAL_GIFT_PLAN_SLUG = "trial_7_basic";
export const TRIAL_GIFT_SOURCE = "trial_gift";

const COURTESY_SOURCES = [TRIAL_GIFT_SOURCE, "trial", "teste", "cortesia", "demo"];

export type LicenseLike = {
  source?: string | null;
  amount?: number | string | null;
  planSlug?: string | null;
  status?: string | null;
  billing_cycle?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  user_id?: string | null;
  trialDays?: number | null;
};

/** Verdadeiro para as licenças de teste doadas pelo administrador. */
export function isCourtesyTrialLicense(license: LicenseLike): boolean {
  const source = String(license.source ?? "").toLowerCase();
  const slug = String(license.planSlug ?? "").toLowerCase();
  const free = Number(license.amount ?? 0) <= 0;
  return slug === TRIAL_GIFT_PLAN_SLUG || (free && COURTESY_SOURCES.includes(source));
}

export type LicenseKind = "trial" | "annual" | "monthly";

export type LicenseStatusDetail = {
  kind: LicenseKind;
  kindLabel: string;
  statusLabel: string;
  /** A licença está válida agora (ativa e dentro da validade). */
  effective: boolean;
  /** Aguardando o cliente ativar a chave no site/app. */
  awaitingActivation: boolean;
  expired: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  aiEnabled: boolean;
  aiNote: string;
  features: FeatureKey[];
  featureLabels: string[];
  lockedLabels: string[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando ativação do cliente",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

export function describeLicense(
  license: LicenseLike,
  now: Date = new Date(),
): LicenseStatusDetail {
  const courtesy = isCourtesyTrialLicense(license);
  const status = String(license.status ?? "pending").toLowerCase();
  const expiresAt = license.expires_at ?? null;
  const expiryMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const expired =
    status === "expired" || (expiryMs != null && Number.isFinite(expiryMs) && expiryMs <= now.getTime());

  const kind: LicenseKind = courtesy
    ? "trial"
    : String(license.billing_cycle ?? "monthly") === "annual"
      ? "annual"
      : "monthly";

  const effective = status === "active" && !expired;
  const awaitingActivation = status === "pending" || (!license.activated_at && status !== "revoked");

  const aiEnabled = effective && !courtesy && planIncludesAi(license.planSlug);
  const features: FeatureKey[] = !effective
    ? FREE_FEATURES
    : courtesy
      ? TRIAL_BASIC_FEATURES
      : aiEnabled
        ? ALL_FEATURES
        : ALL_FEATURES.filter((feature) => feature !== "ai_advisor");

  const daysLeft =
    expiryMs != null && Number.isFinite(expiryMs) && !expired
      ? Math.max(0, Math.ceil((expiryMs - now.getTime()) / 86_400_000))
      : null;

  return {
    kind,
    kindLabel: courtesy
      ? `Teste ${license.trialDays ?? 7} dias (cortesia)`
      : kind === "annual"
        ? "Assinatura anual"
        : "Assinatura mensal",
    statusLabel: STATUS_LABEL[status] ?? status,
    effective,
    awaitingActivation,
    expired,
    expiresAt,
    daysLeft,
    aiEnabled,
    aiNote: courtesy
      ? "IA bloqueada — testes de cortesia nunca liberam o Consultor de IA."
      : aiEnabled
        ? "IA liberada pelo plano Premium IA."
        : effective
          ? "Plano pago sem IA — upgrade para o Premium IA libera as análises."
          : "IA indisponível enquanto a licença não estiver ativa.",
    features,
    featureLabels: features.map((feature) => FEATURE_LABEL[feature]),
    lockedLabels: ALL_FEATURES.filter((feature) => !features.includes(feature)).map(
      (feature) => FEATURE_LABEL[feature],
    ),
  };
}
