import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AskInput = z.object({
  question: z.string().trim().min(3).max(400),
  months: z.number().int().min(1).max(12).optional(),
});

const MODEL = "google/gemini-3.6-flash";

type CategoryTotal = { name: string; total: number; count: number };

/** Consultor de IA: exclusivo para clientes com assinatura ativa. */
export const askAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) Direito de uso: só planos PAGOS (licença paga ativa) ou equipe interna.
    //    Trial/teste/gratuito não usam a IA, pois cada consulta consome créditos.
    const TRIAL_SOURCES = ["trial", "teste", "test", "demo", "cortesia"];
    const TRIAL_SLUGS = ["free", "gratuito", "trial", "teste", "test", "demo"];

    const [{ data: licenses }, { data: profile }, { data: isAdmin }] = await Promise.all([
      supabase.from("licenses").select("status, expires_at, source, amount").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("plan_id, plans(slug, monthly_price, annual_price)")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);

    const paidLicense = (licenses ?? []).some(
      (license) =>
        license.status === "active" &&
        (!license.expires_at || new Date(license.expires_at).getTime() > Date.now()) &&
        !TRIAL_SOURCES.includes(String(license.source ?? "").toLowerCase()) &&
        Number(license.amount ?? 0) > 0,
    );

    const plan = (profile as {
      plans?: { slug?: string; monthly_price?: number | string; annual_price?: number | string } | null;
    } | null)?.plans;
    const planSlug = String(plan?.slug ?? "free").toLowerCase();
    const planPrice = Math.max(Number(plan?.monthly_price ?? 0), Number(plan?.annual_price ?? 0));
    const paidPlan = planPrice > 0 && !TRIAL_SLUGS.includes(planSlug);

    const entitled = paidLicense || paidPlan || isAdmin === true;

    if (!entitled) {
      return {
        entitled: false as const,
        answer:
          "O consultor de IA está disponível apenas nos planos pagos. Períodos de teste e o plano gratuito não incluem a IA, pois cada análise consome créditos. Ative sua assinatura para liberar as análises personalizadas.",
      };
    }


    // 2) Dados do próprio usuário (RLS aplica-se como o usuário autenticado).
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

    const names = new Map((categories ?? []).map((item) => [item.id, item.name]));
    const byCategory = new Map<string, CategoryTotal>();
    let income = 0;
    let expense = 0;
    let essential = 0;

    (transactions ?? []).forEach((item) => {
      const amount = Number(item.amount);
      if (item.transaction_type === "income") {
        income += amount;
        return;
      }
      if (item.transaction_type !== "expense") return;
      expense += amount;
      if (item.is_essential) essential += amount;
      const key = item.category_id ?? "sem-categoria";
      const entry = byCategory.get(key) ?? {
        name: names.get(key) ?? "Sem categoria",
        total: 0,
        count: 0,
      };
      entry.total += amount;
      entry.count += 1;
      byCategory.set(key, entry);
    });

    const top = [...byCategory.values()].sort((a, b) => b.total - a.total).slice(0, 12);
    const brl = (value: number) =>
      value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const summary = [
      `Período analisado: últimos ${months} mês(es), desde ${sinceIso}.`,
      `Total de entradas: ${brl(income)}.`,
      `Total de saídas: ${brl(expense)} (essenciais: ${brl(essential)}).`,
      `Resultado: ${brl(income - expense)}.`,
      `Lançamentos considerados: ${(transactions ?? []).length}.`,
      "Gastos por categoria:",
      ...top.map((item) => `- ${item.name}: ${brl(item.total)} em ${item.count} lançamento(s)`),
      `Orçamentos definidos: ${(budgets ?? []).length}.`,
    ].join("\n");

    // 3) Consulta ao modelo.
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Consultor indisponível: chave de IA não configurada.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "Você é o consultor financeiro do GastoCerto, um app brasileiro de controle de gastos pessoais. " +
        "Responda em português do Brasil, com tom direto e acolhedor. Use os dados fornecidos para: " +
        "mapear onde o dinheiro está indo, apontar comportamentos de risco, dar dicas práticas e sugerir decisões. " +
        "Formate em markdown curto, com listas e valores em reais. Nunca invente dados que não estejam no resumo; " +
        "quando faltar informação, diga o que o usuário precisa registrar para melhorar a análise.",
      prompt: `Resumo financeiro do usuário:\n${summary}\n\nPergunta do usuário: ${data.question}`,
    });

    return { entitled: true as const, answer: text, summary };
  });
