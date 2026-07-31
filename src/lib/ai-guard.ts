import {
  AI_QUOTA_MESSAGE,
  AI_RATE_MESSAGE,
  estimateAiCredits,
  evaluateAiEntitlement,
  evaluateAiRateLimit,
  isAiBalanceLow,
  type AiEntitlement,
  type AiRateVerdict,
} from "./ai-entitlement";
import { monthStartIso } from "./ai-advisor-core";
import {
  AI_LIMITS_SETTING_KEY,
  DEFAULT_AI_LIMITS,
  normalizeAiLimits,
  type AiLimits,
} from "./ai-limits";

/** Cliente Supabase autenticado do middleware (tipagem relaxada de propósito). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type AiUsageSummary = {
  queries: number;
  queryLimit: number;
  credits: number;
  creditAllowance: number;
  blocked: number;
  totalTokens: number;
  quotaExceeded: boolean;
  lowBalance: boolean;
  lowBalanceRatio: number;
};

export type AiReceipt = {
  id: string;
  createdAt: string;
  action: "allowed" | "blocked" | "quota_exceeded" | "rate_limited" | string;
  allowed: boolean;
  reason: string;
  planSlug: string | null;
  model: string | null;
  credits: number;
  totalTokens: number;
  question: string | null;
};

/** Lê os limites configurados pelo administrador (com fallback nos padrões). */
export async function loadAiLimits(supabase: Db): Promise<AiLimits> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", AI_LIMITS_SETTING_KEY)
      .maybeSingle();
    return normalizeAiLimits(data?.value);
  } catch {
    return DEFAULT_AI_LIMITS;
  }
}

/** Avalia o direito de uso da IA lendo licenças, plano e papel do usuário. */
export async function resolveAiAccess(
  supabase: Db,
  userId: string,
): Promise<AiEntitlement> {
  const [licenses, profile, admin] = await Promise.all([
    supabase.from("licenses").select("status, expires_at, source, amount").eq("user_id", userId),
    supabase
      .from("profiles")
      .select("plan_id, trial_ends_at, plans(slug, monthly_price, annual_price)")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);

  return evaluateAiEntitlement({
    licenses: licenses?.data ?? [],
    plan: (profile?.data as { plans?: unknown } | null)?.plans as never,
    trialEndsAt: (profile?.data as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null,
    isAdmin: admin?.data === true,
  });
}

/** Registra no histórico/auditoria cada decisão e cada consumo de créditos. */
export async function logAiUsage(
  supabase: Db,
  entry: {
    userId: string;
    action: "allowed" | "blocked" | "quota_exceeded" | "rate_limited";
    allowed: boolean;
    reason: string;
    planSlug?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    question?: string;
  },
) {
  const inputTokens = Math.max(0, Math.round(entry.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.round(entry.outputTokens ?? 0));
  const totalTokens = inputTokens + outputTokens;

  await supabase.from("ai_usage_log").insert({
    user_id: entry.userId,
    feature: "advisor",
    action: entry.action,
    allowed: entry.allowed,
    reason: entry.reason,
    plan_slug: entry.planSlug ?? null,
    model: entry.model ?? null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    credits: estimateAiCredits(totalTokens),
    question: entry.question?.slice(0, 300) ?? null,
  });
}

/** Consumo do mês corrente para o painel de créditos. */
export async function getMonthlyAiUsage(
  supabase: Db,
  userId: string,
  limits?: AiLimits,
): Promise<AiUsageSummary> {
  const active = limits ?? (await loadAiLimits(supabase));
  const { data } = await supabase
    .from("ai_usage_log")
    .select("allowed, credits, total_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStartIso());

  const rows = (data ?? []) as { allowed: boolean; credits: number | string; total_tokens: number }[];
  const allowedRows = rows.filter((row) => row.allowed);
  const credits = allowedRows.reduce((sum, row) => sum + Number(row.credits ?? 0), 0);
  const totalTokens = allowedRows.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0);

  return {
    queries: allowedRows.length,
    queryLimit: active.monthlyQueryLimit,
    credits: Number(credits.toFixed(4)),
    creditAllowance: active.monthlyCreditAllowance,
    blocked: rows.length - allowedRows.length,
    totalTokens,
    quotaExceeded:
      allowedRows.length >= active.monthlyQueryLimit ||
      credits >= active.monthlyCreditAllowance,
    lowBalance: isAiBalanceLow({
      queries: allowedRows.length,
      queryLimit: active.monthlyQueryLimit,
      credits,
      creditAllowance: active.monthlyCreditAllowance,
      lowCreditRatio: active.lowCreditRatio,
    }),
    lowBalanceRatio: active.lowCreditRatio,
  };
}

/**
 * Rate limiting por usuário: cada tentativa (inclusive as bloqueadas) fica
 * registrada no log, então o próprio histórico serve de contador.
 */
export async function checkAiRateLimit(
  supabase: Db,
  userId: string,
  limits?: AiLimits,
): Promise<AiRateVerdict> {
  const active = limits ?? (await loadAiLimits(supabase));
  const since = new Date(Date.now() - active.burstWindowSeconds * 1000).toISOString();
  const { data } = await supabase
    .from("ai_usage_log")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as { created_at: string }[];
  return evaluateAiRateLimit(rows.map((row) => row.created_at), new Date(), active);
}

/** Recibos detalhados de cada execução/decisão do Consultor. */
export async function listAiReceipts(
  supabase: Db,
  userId: string,
  limit = 30,
): Promise<AiReceipt[]> {
  const { data } = await supabase
    .from("ai_usage_log")
    .select("id, created_at, action, allowed, reason, plan_slug, model, credits, total_tokens, question")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    action: String(row.action),
    allowed: row.allowed === true,
    reason: String(row.reason ?? ""),
    planSlug: row.plan_slug ?? null,
    model: row.model ?? null,
    credits: Number(row.credits ?? 0),
    totalTokens: Number(row.total_tokens ?? 0),
    question: row.question ?? null,
  }));
}

export { AI_QUOTA_MESSAGE, AI_RATE_MESSAGE };
