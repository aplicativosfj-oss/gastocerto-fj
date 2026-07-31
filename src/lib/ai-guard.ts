import {
  AI_MONTHLY_CREDIT_ALLOWANCE,
  AI_MONTHLY_QUERY_LIMIT,
  AI_QUOTA_MESSAGE,
  estimateAiCredits,
  evaluateAiEntitlement,
  type AiEntitlement,
} from "./ai-entitlement";
import { monthStartIso } from "./ai-advisor-core";

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
};

/** Avalia o direito de uso da IA lendo licenças, plano e papel do usuário. */
export async function resolveAiAccess(
  supabase: Db,
  userId: string,
): Promise<AiEntitlement> {
  const [licenses, profile, admin] = await Promise.all([
    supabase.from("licenses").select("status, expires_at, source, amount").eq("user_id", userId),
    supabase
      .from("profiles")
      .select("plan_id, plans(slug, monthly_price, annual_price)")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);

  return evaluateAiEntitlement({
    licenses: licenses?.data ?? [],
    plan: (profile?.data as { plans?: unknown } | null)?.plans as never,
    isAdmin: admin?.data === true,
  });
}

/** Registra no histórico/auditoria cada decisão e cada consumo de créditos. */
export async function logAiUsage(
  supabase: Db,
  entry: {
    userId: string;
    action: "allowed" | "blocked" | "quota_exceeded";
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
export async function getMonthlyAiUsage(supabase: Db, userId: string): Promise<AiUsageSummary> {
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
    queryLimit: AI_MONTHLY_QUERY_LIMIT,
    credits: Number(credits.toFixed(4)),
    creditAllowance: AI_MONTHLY_CREDIT_ALLOWANCE,
    blocked: rows.length - allowedRows.length,
    totalTokens,
    quotaExceeded:
      allowedRows.length >= AI_MONTHLY_QUERY_LIMIT || credits >= AI_MONTHLY_CREDIT_ALLOWANCE,
  };
}

export { AI_QUOTA_MESSAGE };
