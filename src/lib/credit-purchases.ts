import type { Transaction } from "@/lib/transactions";

/** Marcação usada para identificar lançamentos de compra de créditos. */
export const CREDIT_TAG = "creditos";

export type CreditPurchase = {
  id: string;
  date: string;
  description: string;
  credits: number;
  total: number;
  pricePerCredit: number;
  accountId: string | null;
};

/** Monta a anotação padronizada da compra (quantidade e preço por crédito). */
export function creditNote(credits: number, total: number) {
  const unit = credits > 0 ? total / credits : 0;
  return `Créditos: ${credits} · Preço por crédito: R$ ${unit
    .toFixed(4)
    .replace(".", ",")} · Total: R$ ${total.toFixed(2).replace(".", ",")}`;
}

/** Identifica se o lançamento é uma compra de créditos. */
export function isCreditPurchase(row: Transaction) {
  return (row.tags ?? []).includes(CREDIT_TAG);
}

/** Extrai a quantidade de créditos gravada na anotação do lançamento. */
export function parseCredits(row: Transaction): number {
  const match = /Cr[eé]ditos:\s*([\d.,]+)/i.exec(row.notes ?? "");
  if (!match) return 0;
  return Number(match[1].replace(/\./g, "").replace(",", ".")) || 0;
}

/** Normaliza os lançamentos de crédito para exibição em cards/linhas. */
export function creditPurchases(rows: Transaction[]): CreditPurchase[] {
  return rows
    .filter(isCreditPurchase)
    .map((row) => {
      const credits = parseCredits(row);
      const total = Number(row.amount);
      return {
        id: row.id,
        date: row.transaction_date,
        description: row.description,
        credits,
        total,
        pricePerCredit: credits > 0 ? total / credits : 0,
        accountId: row.account_id,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export type CardMonthSummary = {
  accountId: string;
  name: string;
  total: number;
  count: number;
  creditTotal: number;
  creditCount: number;
  credits: number;
  rows: Transaction[];
};

/**
 * Consolida as despesas do mês por cartão de crédito, destacando quanto foi
 * gasto especificamente em compras de créditos.
 */
export function summarizeByCard(
  rows: Transaction[],
  cards: Array<{ id: string; name: string }>,
): CardMonthSummary[] {
  const byId = new Map(cards.map((card) => [card.id, card.name]));
  const map = new Map<string, CardMonthSummary>();

  for (const row of rows) {
    if (row.transaction_type !== "expense") continue;
    const accountId = row.account_id;
    const isCardPayment = row.payment_method === "credit_card";
    if (!accountId || !byId.has(accountId)) {
      if (!isCardPayment) continue;
    }
    const key = accountId && byId.has(accountId) ? accountId : "sem-cartao";
    const current =
      map.get(key) ??
      ({
        accountId: key,
        name: byId.get(key) ?? "Cartão não identificado",
        total: 0,
        count: 0,
        creditTotal: 0,
        creditCount: 0,
        credits: 0,
        rows: [],
      } satisfies CardMonthSummary);

    current.total += Number(row.amount);
    current.count += 1;
    current.rows.push(row);
    if (isCreditPurchase(row)) {
      current.creditTotal += Number(row.amount);
      current.creditCount += 1;
      current.credits += parseCredits(row);
    }
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}
