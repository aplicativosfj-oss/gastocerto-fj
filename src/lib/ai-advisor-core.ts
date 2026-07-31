import { z } from "zod";

export const MODEL = "google/gemini-3.6-flash";

export const AskInput = z.object({
  question: z.string().trim().min(3).max(400),
  months: z.number().int().min(1).max(12).optional(),
});

export const SYSTEM_PROMPT =
  "Você é o consultor financeiro do GastoCerto, um app brasileiro de controle de gastos pessoais. " +
  "Responda em português do Brasil, com tom direto e acolhedor. Use os dados fornecidos para: " +
  "mapear onde o dinheiro está indo, apontar comportamentos de risco, dar dicas práticas e sugerir decisões. " +
  "Formate em markdown curto, com listas e valores em reais. Nunca invente dados que não estejam no resumo; " +
  "quando faltar informação, diga o que o usuário precisa registrar para melhorar a análise.";

export type CategoryTotal = { name: string; total: number; count: number };

type TransactionRow = {
  amount: number | string;
  transaction_type: string;
  category_id: string | null;
  is_essential?: boolean | null;
};

export function buildFinancialSummary(input: {
  months: number;
  sinceIso: string;
  transactions: TransactionRow[];
  categoryNames: Map<string, string>;
  budgetCount: number;
}) {
  const byCategory = new Map<string, CategoryTotal>();
  let income = 0;
  let expense = 0;
  let essential = 0;

  input.transactions.forEach((item) => {
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
      name: input.categoryNames.get(key) ?? "Sem categoria",
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

  return [
    `Período analisado: últimos ${input.months} mês(es), desde ${input.sinceIso}.`,
    `Total de entradas: ${brl(income)}.`,
    `Total de saídas: ${brl(expense)} (essenciais: ${brl(essential)}).`,
    `Resultado: ${brl(income - expense)}.`,
    `Lançamentos considerados: ${input.transactions.length}.`,
    "Gastos por categoria:",
    ...top.map((item) => `- ${item.name}: ${brl(item.total)} em ${item.count} lançamento(s)`),
    `Orçamentos definidos: ${input.budgetCount}.`,
  ].join("\n");
}

export function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
