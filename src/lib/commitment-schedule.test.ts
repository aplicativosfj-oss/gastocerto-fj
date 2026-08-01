import { describe, expect, it } from "vitest";

import { recalcFromNextDue } from "@/lib/commitment-schedule";
import type { Commitment } from "@/lib/commitments";

const base = {
  id: "c1",
  name: "Financiamento",
  start_date: "2026-07-10",
  due_day: 10,
  installments_total: 24,
  installment_amount: 500,
  total_amount: 12000,
  installments_paid: 0,
  is_open_account: false,
  end_date: null,
} as unknown as Commitment;

describe("recalcFromNextDue", () => {
  it("recalcula parcelas pagas, restantes e término", () => {
    const result = recalcFromNextDue(base, "2027-01-10");
    expect(result.installments_paid).toBe(6);
    expect(result.remainingCount).toBe(18);
    expect(result.end_date).toBe("2028-06-10");
    expect(result.remainingAmount).toBe(9000);
    expect(result.due_day).toBe(10);
  });

  it("não passa do total de parcelas", () => {
    const result = recalcFromNextDue(base, "2030-01-10");
    expect(result.installments_paid).toBe(24);
    expect(result.remainingCount).toBe(0);
    expect(result.end_date).toBe("2030-01-10");
  });
});
