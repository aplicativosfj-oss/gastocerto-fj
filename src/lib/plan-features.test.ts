import { describe, expect, it } from "vitest";

import { evaluateAiEntitlement, evaluateAiRateLimit, isAiBalanceLow } from "./ai-entitlement";
import { DEFAULT_AI_LIMITS, normalizeAiLimits } from "./ai-limits";
import { resolvePlanAccess, hasFeature, trialDaysForSlug } from "./plan-features";

const now = new Date("2026-07-31T12:00:00Z");

describe("limites configuráveis da IA", () => {
  it("usa os padrões quando o valor é inválido", () => {
    expect(normalizeAiLimits(null)).toEqual(DEFAULT_AI_LIMITS);
    expect(normalizeAiLimits({ rateMaxInWindow: "abc" })).toEqual(DEFAULT_AI_LIMITS);
  });

  it("aceita e coage valores válidos do administrador", () => {
    const limits = normalizeAiLimits({ rateMaxInWindow: "12", lowCreditRatio: "0.35" });
    expect(limits.rateMaxInWindow).toBe(12);
    expect(limits.lowCreditRatio).toBeCloseTo(0.35);
  });

  it("garante que a janela longa nunca é menor que a curta", () => {
    const limits = normalizeAiLimits({ rateWindowSeconds: 600, burstWindowSeconds: 60 });
    expect(limits.burstWindowSeconds).toBeGreaterThanOrEqual(limits.rateWindowSeconds);
  });

  it("respeita o limite customizado no rate limiting", () => {
    const attempts = [1, 2].map((offset) => new Date(now.getTime() - offset * 1000));
    const strict = normalizeAiLimits({ rateMaxInWindow: 2 });
    expect(evaluateAiRateLimit(attempts, now, strict).allowed).toBe(false);
    expect(evaluateAiRateLimit(attempts, now, DEFAULT_AI_LIMITS).allowed).toBe(true);
  });

  it("respeita o threshold customizado do alerta de créditos", () => {
    const usage = { queries: 10, queryLimit: 120, credits: 25, creditAllowance: 50 };
    expect(isAiBalanceLow(usage)).toBe(false);
    expect(isAiBalanceLow({ ...usage, lowCreditRatio: 0.6 })).toBe(true);
  });
});

describe("IA durante o período de teste", () => {
  it("libera a IA enquanto o teste está vigente", () => {
    const result = evaluateAiEntitlement({
      plan: { slug: "trial_7", monthly_price: 0, annual_price: 0 },
      trialEndsAt: new Date(now.getTime() + 3 * 86_400_000),
      now,
    });
    expect(result.entitled).toBe(true);
    expect(result.reason).toBe("trial_active");
  });

  it("bloqueia quando o teste expirou", () => {
    const result = evaluateAiEntitlement({
      plan: { slug: "trial_7", monthly_price: 0, annual_price: 0 },
      trialEndsAt: new Date(now.getTime() - 86_400_000),
      now,
    });
    expect(result.entitled).toBe(false);
    expect(result.reason).toBe("trial_expired");
  });

  it("mantém o plano gratuito sem IA", () => {
    const result = evaluateAiEntitlement({ plan: { slug: "free" }, now });
    expect(result.entitled).toBe(false);
    expect(result.reason).toBe("free_plan");
  });
});

describe("planos e recursos", () => {
  it("gratuito libera apenas o essencial", () => {
    const access = resolvePlanAccess({ planSlug: "free", planTier: "free", now });
    expect(access.tier).toBe("free");
    expect(hasFeature(access, "transactions")).toBe(true);
    expect(hasFeature(access, "ai_advisor")).toBe(false);
    expect(hasFeature(access, "vehicles")).toBe(false);
    expect(access.freeTransactionLimit).toBe(30);
    expect(access.limits.shareLinks).toBe(0);
  });

  it("teste vigente libera tudo e calcula os dias restantes", () => {
    const access = resolvePlanAccess({
      planSlug: "trial_15",
      planTier: "trial",
      trialEndsAt: new Date(now.getTime() + 5 * 86_400_000),
      now,
    });
    expect(access.tier).toBe("trial");
    expect(access.trialDaysLeft).toBe(5);
    expect(hasFeature(access, "ai_advisor")).toBe(true);
    expect(access.locked).toHaveLength(0);
  });

  it("teste expirado volta para o gratuito", () => {
    const access = resolvePlanAccess({
      planSlug: "trial_7",
      planTier: "trial",
      trialEndsAt: new Date(now.getTime() - 60_000),
      now,
    });
    expect(access.tier).toBe("free");
    expect(hasFeature(access, "reports_advanced")).toBe(false);
  });

  it("licença paga antiga sem plano identificado libera tudo", () => {
    const access = resolvePlanAccess({ planSlug: "free", hasPaidLicense: true, now });
    expect(access.tier).toBe("paid");
    expect(hasFeature(access, "ai_advisor")).toBe(true);
  });

  it("Premium é pago, porém sem IA e com cotas", () => {
    const access = resolvePlanAccess({
      planSlug: "premium",
      planTier: "paid",
      planPrice: 24.9,
      hasPaidLicense: true,
      paidPlanSlug: "premium",
      now,
    });
    expect(access.tier).toBe("paid");
    expect(access.aiIncluded).toBe(false);
    expect(hasFeature(access, "ai_advisor")).toBe(false);
    expect(hasFeature(access, "reports_advanced")).toBe(true);
    expect(access.limits.vehicles).toBe(2);
    expect(access.limits.shareLinks).toBe(2);
    expect(access.limits.aiQueries).toBe(0);
    expect(access.limits.monthlyTransactions).toBeNull();
    expect(withinLimit(access, "vehicles", 2)).toBe(false);
    expect(withinLimit(access, "vehicles", 1)).toBe(true);
  });

  it("Premium IA libera IA e remove as cotas", () => {
    const access = resolvePlanAccess({
      planSlug: "premium_ia",
      planTier: "paid",
      planPrice: 34.9,
      hasPaidLicense: true,
      paidPlanSlug: "premium_ia",
      now,
    });
    expect(access.aiIncluded).toBe(true);
    expect(access.limits.vehicles).toBeNull();
    expect(access.limits.aiQueries).toBeGreaterThan(0);
    expect(withinLimit(access, "vehicles", 99)).toBe(true);
  });

  it("mapeia a duração de cada teste", () => {
    expect(trialDaysForSlug("trial_7")).toBe(7);
    expect(trialDaysForSlug("trial_30")).toBe(30);
    expect(trialDaysForSlug("premium")).toBeNull();
  });
});
