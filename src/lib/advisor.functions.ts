import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AskInput, MODEL, SYSTEM_PROMPT, buildFinancialSummary } from "@/lib/ai-advisor-core";
import { AI_BLOCK_MESSAGE, AI_QUOTA_MESSAGE, AI_RATE_MESSAGE } from "@/lib/ai-entitlement";
import {
  checkAiRateLimit,
  loadAiLimits,
  getMonthlyAiUsage,
  listAiReceipts,
  logAiUsage,
  resolveAiAccess,
} from "@/lib/ai-guard";

/** Direito de uso + consumo do mês (para banner e painel de créditos). */
export const getAdvisorAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const limits = await loadAiLimits(supabase);
    const access = await resolveAiAccess(supabase, userId);
    const [usage, receipts] = await Promise.all([
      getMonthlyAiUsage(supabase, userId, limits),
      listAiReceipts(supabase, userId, 30),
    ]);
    return { ...access, usage, receipts, limits };
  });

/** Consultor de IA: exclusivo para clientes com licença/plano pago ativo. */
export const askAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 0) Rate limiting por usuário: barra tentativas repetidas antes de qualquer custo.
    const limits = await loadAiLimits(supabase);
    const rate = await checkAiRateLimit(supabase, userId, limits);
    if (!rate.allowed) {
      return {
        entitled: true as const,
        rateLimited: true as const,
        retryAfterSeconds: rate.retryAfterSeconds,
        answer: AI_RATE_MESSAGE,
      };
    }

    // 1) Guard de plano: trial/teste/free nunca executam a análise, nem via requisição direta.
    const access = await resolveAiAccess(supabase, userId);
    if (!access.entitled) {
      await logAiUsage(supabase, {
        userId,
        action: "blocked",
        allowed: false,
        reason: access.reason,
        planSlug: access.planSlug,
        question: data.question,
      });
      return { entitled: false as const, reason: access.reason, answer: AI_BLOCK_MESSAGE };
    }

    // 2) Limite mensal de consumo de créditos.
    const usage = await getMonthlyAiUsage(supabase, userId, limits);
    if (usage.quotaExceeded) {
      await logAiUsage(supabase, {
        userId,
        action: "quota_exceeded",
        allowed: false,
        reason: "monthly_quota",
        planSlug: access.planSlug,
        question: data.question,
      });
      return { entitled: true as const, quotaExceeded: true as const, answer: AI_QUOTA_MESSAGE };
    }

    // 3) Dados do próprio usuário (RLS aplica-se como o usuário autenticado).
    const months = data.months ?? 3;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceIso = since.toISOString().slice(0, 10);

    const [{ data: transactions }, { data: categories }, { data: budgets }] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, transaction_type, transaction_date, category_id, description, is_essential")
        .gte("transaction_date", sinceIso)
        .is("deleted_at", null)
        .limit(2000),
      supabase.from("categories").select("id, name"),
      supabase.from("budgets").select("category_id, limit_amount, month, year"),
    ]);

    const summary = buildFinancialSummary({
      months,
      sinceIso,
      transactions: transactions ?? [],
      categoryNames: new Map((categories ?? []).map((item) => [item.id, item.name])),
      budgetCount: (budgets ?? []).length,
    });

    // 4) Consulta ao modelo.
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Consultor indisponível: chave de IA não configurada.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const result = await generateText({
      model: gateway(MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Resumo financeiro do usuário:\n${summary}\n\nPergunta do usuário: ${data.question}`,
    });

    // 5) Auditoria do consumo de créditos.
    await logAiUsage(supabase, {
      userId,
      action: "allowed",
      allowed: true,
      reason: access.reason,
      planSlug: access.planSlug,
      model: MODEL,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      question: data.question,
    });

    return { entitled: true as const, answer: result.text, summary };
  });
