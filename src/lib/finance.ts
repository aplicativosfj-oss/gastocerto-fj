/** Constantes e utilitários de domínio financeiro. */

export const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "vale_alimentacao", label: "Vale-alimentação" },
  { value: "outro", label: "Outro" },
] as const;

export const EXPENSE_TYPES = [
  { value: "fixa", label: "Fixa" },
  { value: "variavel", label: "Variável" },
  { value: "recorrente", label: "Recorrente" },
  { value: "parcelada", label: "Parcelada" },
  { value: "eventual", label: "Eventual" },
] as const;

export const TRANSACTION_STATUS = [
  { value: "paid", label: "Pago" },
  { value: "pending", label: "Pendente" },
  { value: "overdue", label: "Atrasado" },
  { value: "received", label: "Recebido" },
  { value: "canceled", label: "Cancelado" },
] as const;

export const INCOME_SOURCES = [
  "Salário",
  "Freelance",
  "Comissão",
  "Venda",
  "Benefício",
  "Reembolso",
  "Aluguel recebido",
  "Outros",
] as const;

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Converte "1.234,56" ou "1234.56" em número. Retorna NaN quando inválido. */
export function parseAmount(input: string): number {
  const cleaned = input
    .replace(/\s/g, "")
    .replace(/R\$/i, "")
    .replace(/\./g, (match, offset: number, full: string) =>
      full.includes(",") ? "" : match,
    )
    .replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Arredonda para centavos evitando erros de ponto flutuante. */
export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: isoDate(start), end: isoDate(end), days: end.getDate() };
}

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
