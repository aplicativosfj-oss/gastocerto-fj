import { describe, expect, it } from "vitest";

import { addDaysIso, daysBetween, durationLabel, summarizeGas } from "./gas-analytics";

const refills = [
  { id: "a", refill_date: "2026-07-01", amount: 110, size_kg: 13, supplier: "Ultragaz" },
  { id: "b", refill_date: "2026-08-30", amount: 120, size_kg: 13, supplier: "Ultragaz" },
  { id: "c", refill_date: "2026-10-29", amount: 130, size_kg: 13, supplier: "Liquigás" },
];

describe("gas-analytics", () => {
  it("conta os dias entre duas datas", () => {
    expect(daysBetween("2026-07-01", "2026-07-31")).toBe(30);
  });

  it("soma dias em datas ISO", () => {
    expect(addDaysIso("2026-07-01", 60)).toBe("2026-08-30");
  });

  it("calcula duração, média e custo por dia", () => {
    const summary = summarizeGas(refills, new Date("2026-11-08T12:00:00Z"));
    expect(summary.refillCount).toBe(3);
    expect(summary.closed).toHaveLength(2);
    expect(summary.closed[0]?.days).toBe(60);
    expect(summary.closed[1]?.days).toBe(60);
    expect(summary.averageDays).toBe(60);
    expect(summary.totalSpent).toBe(360);
    expect(summary.averageAmount).toBe(120);
    expect(summary.averageCostPerDay).toBe(2);
    expect(summary.lastRefillDate).toBe("2026-10-29");
    expect(summary.daysSinceLast).toBe(10);
  });

  it("prevê a próxima troca pela média de duração", () => {
    const summary = summarizeGas(refills, new Date("2026-11-08T12:00:00Z"));
    expect(summary.nextRefillDate).toBe("2026-12-28");
    expect(summary.daysUntilNext).toBe(50);
  });

  it("mantém o botijão atual como em uso", () => {
    const summary = summarizeGas(refills, new Date("2026-11-08T12:00:00Z"));
    const last = summary.cycles[summary.cycles.length - 1];
    expect(last?.endDate).toBeNull();
    expect(last?.days).toBeNull();
    expect(durationLabel(last?.days ?? null)).toBe("Em uso");
  });

  it("não quebra sem registros", () => {
    const summary = summarizeGas([]);
    expect(summary.refillCount).toBe(0);
    expect(summary.averageDays).toBeNull();
    expect(summary.nextRefillDate).toBeNull();
  });
});
