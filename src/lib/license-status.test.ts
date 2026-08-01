import { describe, expect, it } from "vitest";

import { describeLicense, isCourtesyTrialLicense } from "./license-status";
import { resolvePlanAccess } from "./plan-features";

const gift = {
  source: "trial_gift",
  amount: 0,
  planSlug: "trial_7_basic",
  billing_cycle: "monthly",
  trialDays: 7,
};

describe("license-status", () => {
  it("reconhece licenças de teste de cortesia", () => {
    expect(isCourtesyTrialLicense(gift)).toBe(true);
    expect(
      isCourtesyTrialLicense({ source: "manual", amount: 398, planSlug: "premium_ia" }),
    ).toBe(false);
  });

  it("mantém a licença de teste pendente até o cliente ativar", () => {
    const info = describeLicense({ ...gift, status: "pending", expires_at: null });
    expect(info.awaitingActivation).toBe(true);
    expect(info.effective).toBe(false);
    expect(info.expiresAt).toBeNull();
    expect(info.aiEnabled).toBe(false);
  });

  it("teste ativo libera recursos limitados e nunca a IA", () => {
    const expires = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const info = describeLicense({
      ...gift,
      status: "active",
      activated_at: new Date().toISOString(),
      expires_at: expires,
      user_id: "u1",
    });
    expect(info.effective).toBe(true);
    expect(info.aiEnabled).toBe(false);
    expect(info.features).not.toContain("ai_advisor");
    expect(info.features).not.toContain("reports_advanced");
    expect(info.lockedLabels.length).toBeGreaterThan(0);
    expect(info.daysLeft).toBeGreaterThan(0);
  });

  it("assinatura anual Premium IA habilita a IA", () => {
    const info = describeLicense({
      source: "manual",
      amount: 398,
      planSlug: "premium_ia",
      billing_cycle: "annual",
      status: "active",
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 300 * 86_400_000).toISOString(),
      user_id: "u1",
    });
    expect(info.kindLabel).toBe("Assinatura anual");
    expect(info.aiEnabled).toBe(true);
    expect(info.features).toContain("ai_advisor");
  });

  it("licença expirada volta aos recursos gratuitos", () => {
    const info = describeLicense({
      source: "manual",
      amount: 24.9,
      planSlug: "premium",
      status: "active",
      expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(info.expired).toBe(true);
    expect(info.effective).toBe(false);
    expect(info.features).toEqual(["dashboard", "transactions", "categories", "monthly_balance"]);
  });
});

describe("plano durante teste de cortesia", () => {
  it("não libera IA nem relatórios avançados", () => {
    const access = resolvePlanAccess({
      planSlug: "trial_7_basic",
      trialPlanSlug: "trial_7_basic",
      trialEndsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    });
    expect(access.tier).toBe("trial");
    expect(access.courtesyTrial).toBe(true);
    expect(access.aiIncluded).toBe(false);
    expect(access.features).not.toContain("ai_advisor");
    expect(access.locked).toContain("reports_advanced");
  });

  it("teste completo de 15 dias mantém tudo liberado", () => {
    const access = resolvePlanAccess({
      planSlug: "trial_15",
      trialPlanSlug: "trial_15",
      trialEndsAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    });
    expect(access.courtesyTrial).toBe(false);
    expect(access.aiIncluded).toBe(true);
    expect(access.features).toContain("ai_advisor");
  });
});
