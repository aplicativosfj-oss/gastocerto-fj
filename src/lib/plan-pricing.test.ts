import { describe, expect, it } from "vitest";

import {
  annualMonthlyEquivalent,
  normalizeAnnual,
  normalizePlanPrices,
  roundMonthly,
  suggestedAnnual,
} from "./plan-pricing";

describe("plan-pricing", () => {
  it("arredonda o mensal para centavos", () => {
    expect(roundMonthly(24.899)).toBe(24.9);
    expect(roundMonthly(-5)).toBe(0);
  });

  it("normaliza o anual para múltiplo de 12", () => {
    expect(normalizeAnnual(349)).toBe(348);
    expect(normalizeAnnual(348)).toBe(348);
  });

  it("nunca exibe equivalente mensal quebrado como 29,08", () => {
    const { annual, monthlyEquivalent } = normalizePlanPrices({ monthly: 34.9, annual: 349 });
    expect(annual).toBe(348);
    expect(monthlyEquivalent).toBe(29);
  });

  it("calcula economia do anual", () => {
    const result = normalizePlanPrices({ monthly: 34.9, annual: 348 });
    expect(result.savingsPercent).toBe(17);
    expect(result.savingsAmount).toBe(70.8);
  });

  it("sugere anual com desconto já normalizado", () => {
    const annual = suggestedAnnual(24.9);
    expect(annual % 12).toBe(0);
    expect(annualMonthlyEquivalent(annual)).toBeLessThan(24.9);
  });

  it("mantém plano gratuito em zero", () => {
    expect(normalizePlanPrices({ monthly: 0, annual: 120 })).toMatchObject({ monthly: 0, annual: 0 });
  });
});
