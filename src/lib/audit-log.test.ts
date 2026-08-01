import { describe, expect, it } from "vitest";

import {
  AUDIT_CATEGORY_LABELS,
  auditLogsToCsv,
  categorizeAction,
  filterAuditLogs,
  periodLabel,
  remainingTime,
  type AuditLogRow,
} from "@/lib/audit-log";

const rows: AuditLogRow[] = [
  {
    id: "1",
    created_at: "2026-07-10T12:00:00.000Z",
    actor_id: "admin-1",
    target_user_id: null,
    action: "admin_access_code_created",
    details: { label: "Acesso rápido" },
  },
  {
    id: "2",
    created_at: "2026-07-20T12:00:00.000Z",
    actor_id: "admin-1",
    target_user_id: "user-9",
    action: "user_role_updated",
    details: { role: "support" },
  },
  {
    id: "3",
    created_at: "2026-08-01T12:00:00.000Z",
    actor_id: "admin-2",
    target_user_id: null,
    action: "plan_config_updated",
    details: { price: 24.9 },
  },
];

describe("categorizeAction", () => {
  it("classifica códigos, permissões, planos e usuários", () => {
    expect(categorizeAction("admin_access_code_revoked")).toBe("codes");
    expect(categorizeAction("license_created")).toBe("codes");
    expect(categorizeAction("user_role_updated")).toBe("permissions");
    expect(categorizeAction("plan_config_updated")).toBe("plans");
    expect(categorizeAction("announcement_created")).toBe("plans");
    expect(categorizeAction("profile_status_changed")).toBe("users");
    expect(categorizeAction("algo_desconhecido")).toBe("other");
  });

  it("tem rótulo para toda categoria", () => {
    for (const row of rows) {
      expect(AUDIT_CATEGORY_LABELS[categorizeAction(row.action)]).toBeTruthy();
    }
  });
});

describe("filterAuditLogs", () => {
  it("filtra por período inclusivo", () => {
    const result = filterAuditLogs(rows, { from: "2026-07-20", to: "2026-07-20" });
    expect(result.map((r) => r.id)).toEqual(["2"]);
  });

  it("filtra por categoria", () => {
    expect(filterAuditLogs(rows, { category: "codes" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterAuditLogs(rows, { category: "all" })).toHaveLength(3);
  });

  it("busca na ação e nos detalhes", () => {
    expect(filterAuditLogs(rows, { search: "support" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterAuditLogs(rows, { search: "24.9" }).map((r) => r.id)).toEqual(["3"]);
    expect(filterAuditLogs(rows, { search: "inexistente" })).toHaveLength(0);
  });
});

describe("auditLogsToCsv", () => {
  it("gera cabeçalho e uma linha por registro com nomes resolvidos", () => {
    const csv = auditLogsToCsv(rows, new Map([["admin-1", "Ana Admin"]]));
    const lines = csv.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("Data/Hora");
    expect(csv).toContain("Ana Admin");
    expect(csv).toContain("admin-2");
  });

  it("escapa aspas nos detalhes", () => {
    const csv = auditLogsToCsv([{ ...rows[0]!, details: { note: 'diz "oi"' } }]);
    expect(csv).toContain('""');
  });
});

describe("periodLabel", () => {
  it("descreve o período selecionado", () => {
    expect(periodLabel("2026-07-01", "2026-07-31")).toBe("01/07/2026 a 31/07/2026");
    expect(periodLabel("2026-07-01", null)).toContain("a partir de");
    expect(periodLabel(null, "2026-07-31")).toContain("até");
    expect(periodLabel(null, null)).toBe("todo o histórico");
  });
});

describe("remainingTime", () => {
  const now = new Date("2026-08-01T12:00:00.000Z").getTime();

  it("marca expiradas", () => {
    expect(remainingTime("2026-07-31T12:00:00.000Z", now).expired).toBe(true);
    expect(remainingTime("2026-07-31T12:00:00.000Z", now).tone).toBe("expired");
  });

  it("mostra dias, horas e minutos", () => {
    expect(remainingTime("2026-08-11T15:30:00.000Z", now).text).toBe("10d 3h 30m restantes");
    expect(remainingTime("2026-08-11T15:30:00.000Z", now).tone).toBe("ok");
  });

  it("alerta quando falta pouco", () => {
    expect(remainingTime("2026-08-03T12:00:00.000Z", now).tone).toBe("soon");
    expect(remainingTime("2026-08-01T12:00:45.000Z", now).text).toBe("0m 45s restantes");
  });

  it("trata validade indefinida", () => {
    expect(remainingTime(null, now).tone).toBe("neutral");
  });
});
