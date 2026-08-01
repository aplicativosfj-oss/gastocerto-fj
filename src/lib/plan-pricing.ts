/**
 * Regras de arredondamento de preços dos planos.
 *
 * O valor anual é sempre normalizado para um múltiplo de 12, garantindo que o
 * equivalente mensal exibido ao cliente nunca apareça quebrado (ex.: 29,08).
 */
export const DEFAULT_ANNUAL_DISCOUNT = 0.17;

/** Arredonda o preço mensal para duas casas (centavos). */
export function roundMonthly(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

/** Ajusta o anual para o múltiplo de 12 mais próximo (equivalente mensal inteiro). */
export function normalizeAnnual(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(12, Math.round(value / 12) * 12);
}

/** Sugere um anual com desconto a partir do mensal, já normalizado. */
export function suggestedAnnual(monthly: number, discount = DEFAULT_ANNUAL_DISCOUNT): number {
  const base = roundMonthly(monthly) * 12 * (1 - discount);
  return normalizeAnnual(base);
}

/** Equivalente mensal do plano anual (sempre limpo depois da normalização). */
export function annualMonthlyEquivalent(annual: number): number {
  if (!Number.isFinite(annual) || annual <= 0) return 0;
  return Math.round((annual / 12) * 100) / 100;
}

/** Percentual de economia do anual em relação ao mensal. */
export function annualSavingsPercent(monthly: number, annual: number): number {
  const m = roundMonthly(monthly);
  if (m <= 0 || annual <= 0) return 0;
  return Math.max(0, Math.round((1 - annualMonthlyEquivalent(annual) / m) * 100));
}

/** Economia em reais por ano ao escolher o anual. */
export function annualSavingsAmount(monthly: number, annual: number): number {
  const m = roundMonthly(monthly);
  if (m <= 0 || annual <= 0) return 0;
  return Math.max(0, Math.round((m * 12 - annual) * 100) / 100);
}

/** Normaliza um par de preços antes de gravar no banco. */
export function normalizePlanPrices(input: { monthly: number; annual: number }) {
  const monthly = roundMonthly(input.monthly);
  const annual = monthly === 0 ? 0 : normalizeAnnual(input.annual);
  return {
    monthly,
    annual,
    monthlyEquivalent: annualMonthlyEquivalent(annual),
    savingsPercent: annualSavingsPercent(monthly, annual),
    savingsAmount: annualSavingsAmount(monthly, annual),
    adjusted: monthly !== input.monthly || annual !== input.annual,
  };
}
