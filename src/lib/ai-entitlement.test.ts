import { describe, expect, it } from "vitest";

import {
  AI_BLOCK_MESSAGE,
  estimateAiCredits,
  evaluateAiEntitlement,
  AI_RATE_MAX_IN_WINDOW,
  evaluateAiRateLimit,
  isAiBalanceLow,
} from "./ai-entitlement";

const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

const paidPlan = { slug: "premium_ia", monthly_price: 39.9, annual_price: 398 };
const paidPlanNoAi = { slug: "premium", monthly_price: 24.9, annual_price: 239 };
const freePlan = { slug: "free", monthly_price: 0, annual_price: 0 };
const trialPlan = { slug: "trial", monthly_price: 0, annual_price: 0 };

describe("evaluateAiEntitlement", () => {
  it("libera a IA com licença paga ativa", () => {
    const result = evaluateAiEntitlement({
      licenses: [{ status: "active", expires_at: future, source: "mercadopago", amount: 19.9 }],
      plan: freePlan,
    });
    expect(result.entitled).toBe(true);
    expect(result.reason).toBe("paid_license");
  });

  it("libera a IA no plano pago com IA integrada", () => {
    expect(evaluateAiEntitlement({ plan: paidPlan }).entitled).toBe(true);
  });

  it("bloqueia plano pago sem IA integrada", () => {
    const result = evaluateAiEntitlement({ plan: paidPlanNoAi });
    expect(result.entitled).toBe(false);
    expect(result.reason).toBe("plan_without_ai");
  });

  it("libera para administradores", () => {
    expect(evaluateAiEntitlement({ plan: freePlan, isAdmin: true }).entitled).toBe(true);
  });

  it("bloqueia plano gratuito com a mensagem correta", () => {
    const result = evaluateAiEntitlement({ plan: freePlan });
    expect(result.entitled).toBe(false);
    expect(result.reason).toBe("free_plan");
    expect(result.message).toBe(AI_BLOCK_MESSAGE);
  });

  it("bloqueia plano trial/teste", () => {
    const trial = evaluateAiEntitlement({ plan: trialPlan });
    expect(trial.entitled).toBe(false);
    expect(trial.reason).toBe("trial_plan");
    expect(trial.message).toBe(AI_BLOCK_MESSAGE);

    const teste = evaluateAiEntitlement({ plan: { slug: "teste", monthly_price: 0 } });
    expect(teste.entitled).toBe(false);
  });

  it("bloqueia licença de trial/cortesia mesmo ativa", () => {
    const result = evaluateAiEntitlement({
      licenses: [{ status: "active", expires_at: future, source: "trial", amount: 0 }],
      plan: freePlan,
    });
    expect(result.entitled).toBe(false);
    expect(result.message).toBe(AI_BLOCK_MESSAGE);
  });

  it("bloqueia licença paga expirada ou pendente", () => {
    expect(
      evaluateAiEntitlement({
        licenses: [{ status: "active", expires_at: past, source: "pix", amount: 199 }],
        plan: freePlan,
      }).entitled,
    ).toBe(false);

    expect(
      evaluateAiEntitlement({
        licenses: [{ status: "pending", expires_at: future, source: "pix", amount: 199 }],
        plan: freePlan,
      }).entitled,
    ).toBe(false);
  });

  it("bloqueia quando não há plano nem licença", () => {
    const result = evaluateAiEntitlement({});
    expect(result.entitled).toBe(false);
    expect(result.reason).toBe("no_plan");
  });
});

describe("estimateAiCredits", () => {
  it("estima créditos a partir dos tokens", () => {
    expect(estimateAiCredits(1000)).toBeCloseTo(0.05, 4);
    expect(estimateAiCredits(0)).toBe(0);
    expect(estimateAiCredits(-10)).toBe(0);
  });
});

describe("rate limiting da IA", () => {
  const now = new Date("2026-07-31T12:00:00Z");

  it("permite quando há poucas tentativas recentes", () => {
    const verdict = evaluateAiRateLimit([new Date("2026-07-31T11:59:30Z")], now);
    expect(verdict.allowed).toBe(true);
  });

  it("bloqueia rajada de tentativas na mesma janela", () => {
    const attempts = Array.from({ length: AI_RATE_MAX_IN_WINDOW }, (_, i) =>
      new Date(now.getTime() - i * 2000),
    );
    const verdict = evaluateAiRateLimit(attempts, now);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera novamente quando as tentativas saem da janela", () => {
    const attempts = Array.from({ length: AI_RATE_MAX_IN_WINDOW }, () =>
      new Date(now.getTime() - 5 * 60 * 1000),
    );
    expect(evaluateAiRateLimit(attempts, now).allowed).toBe(true);
  });
});

describe("alerta de créditos baixos", () => {
  it("alerta abaixo de 20% restantes", () => {
    expect(
      isAiBalanceLow({ queries: 10, queryLimit: 120, credits: 41, creditAllowance: 50 }),
    ).toBe(true);
  });

  it("não alerta com saldo confortável", () => {
    expect(
      isAiBalanceLow({ queries: 10, queryLimit: 120, credits: 5, creditAllowance: 50 }),
    ).toBe(false);
  });
});
