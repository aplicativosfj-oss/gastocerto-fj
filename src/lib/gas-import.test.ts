import { describe, expect, it } from "vitest";

import { parseGasAmount, parseGasCsv, parseGasDate } from "@/lib/gas-import";
import { buildGasReminders } from "@/lib/gas-reminders";
import type { GasSummary } from "@/lib/gas-analytics";

describe("parseGasDate / parseGasAmount", () => {
  it("aceita datas brasileiras e ISO", () => {
    expect(parseGasDate("05/03/2026")).toBe("2026-03-05");
    expect(parseGasDate("2026-3-5")).toBe("2026-03-05");
    expect(parseGasDate("banana")).toBeNull();
  });

  it("aceita valores com vírgula e ponto", () => {
    expect(parseGasAmount("R$ 1.234,56")).toBeCloseTo(1234.56);
    expect(parseGasAmount("120.50")).toBeCloseTo(120.5);
    expect(parseGasAmount("")).toBeNull();
  });
});

describe("parseGasCsv", () => {
  it("ignora cabeçalho, remove duplicados e reporta erros", () => {
    const result = parseGasCsv(
      [
        "data;valor;tamanho_kg;revenda;pagamento;obs",
        "10/01/2026;115,00;13;Ultragaz;pix;",
        "10/01/2026;115,00;13;Ultragaz;pix;",
        "xx;100;13;;;",
        "12/03/2026;120,00;;Liquigás;dinheiro;troca rápida",
      ].join("\n"),
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.refill_date).toBe("2026-01-10");
    expect(result.rows[1]?.size_kg).toBe(13);
    expect(result.errors).toHaveLength(1);
  });
});

function summary(partial: Partial<GasSummary>): GasSummary {
  return {
    refillCount: 3,
    totalSpent: 300,
    averageAmount: 100,
    averageDays: 45,
    averageWeeks: 6.4,
    averageMonths: 1.5,
    averageCostPerDay: 2.2,
    averageMonthlyCost: 66,
    shortestDays: 40,
    longestDays: 50,
    lastRefillDate: "2026-07-01",
    daysSinceLast: 40,
    nextRefillDate: "2026-08-15",
    daysUntilNext: 40,
    cycles: [],
    closed: [],
    ...partial,
  } as GasSummary;
}

describe("buildGasReminders", () => {
  it("não avisa quando a troca está longe", () => {
    expect(buildGasReminders(summary({ daysUntilNext: 30 }))).toHaveLength(0);
  });

  it("avisa quando falta pouco", () => {
    const [reminder] = buildGasReminders(summary({ daysUntilNext: 3 }), { daysBefore: 7 });
    expect(reminder?.severity).toBe("info");
    expect(reminder?.dedupeKey).toContain("gas:due:");
  });

  it("alerta quando passou da média", () => {
    const [reminder] = buildGasReminders(summary({ daysUntilNext: -5 }));
    expect(reminder?.severity).toBe("warning");
    expect(reminder?.dedupeKey).toContain("gas:overdue:");
  });

  it("não gera nada sem previsão", () => {
    expect(buildGasReminders(summary({ nextRefillDate: null, daysUntilNext: null }))).toHaveLength(
      0,
    );
  });
});
