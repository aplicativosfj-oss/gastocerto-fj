import { describe, expect, it, vi } from "vitest";

import { assertAdminCtx, assertStaffCtx, auditLog } from "@/lib/admin-guard.server";

function makeContext(roles: Record<string, boolean>, options: { rpcError?: boolean } = {}) {
  const inserts: unknown[] = [];
  const context = {
    userId: "user-1",
    supabase: {
      rpc: vi.fn(async (_fn: string, args: { _role: string }) =>
        options.rpcError
          ? { data: null, error: new Error("boom") }
          : { data: Boolean(roles[args._role]), error: null },
      ),
      from: vi.fn(() => ({
        insert: async (payload: unknown) => {
          inserts.push(payload);
          return { error: null };
        },
      })),
    },
  };
  return { context, inserts };
}

describe("assertAdminCtx", () => {
  it("permite administradores", async () => {
    const { context } = makeContext({ admin: true });
    await expect(assertAdminCtx(context)).resolves.toBeUndefined();
  });

  it("bloqueia usuários comuns", async () => {
    const { context } = makeContext({ admin: false });
    await expect(assertAdminCtx(context)).rejects.toThrow(/restrito a administradores/i);
  });

  it("bloqueia suporte em ações exclusivas de admin", async () => {
    const { context } = makeContext({ support: true });
    await expect(assertAdminCtx(context)).rejects.toThrow(/restrito a administradores/i);
  });

  it("falha fechado quando a validação de papel dá erro", async () => {
    const { context } = makeContext({ admin: true }, { rpcError: true });
    await expect(assertAdminCtx(context)).rejects.toThrow(/validar as permissões/i);
  });
});

describe("assertStaffCtx", () => {
  it("aceita admin e informa o papel", async () => {
    const { context } = makeContext({ admin: true });
    await expect(assertStaffCtx(context)).resolves.toEqual({ isAdmin: true, isSupport: false });
  });

  it("aceita suporte com leitura, sem privilégio de admin", async () => {
    const { context } = makeContext({ support: true });
    await expect(assertStaffCtx(context)).resolves.toEqual({ isAdmin: false, isSupport: true });
  });

  it("bloqueia quem não é da equipe", async () => {
    const { context } = makeContext({});
    await expect(assertStaffCtx(context)).rejects.toThrow(/acesso negado/i);
  });
});

describe("auditLog", () => {
  it("registra ator, ação, alvo e detalhes", async () => {
    const { context, inserts } = makeContext({ admin: true });
    await auditLog(context, "admin_access_code_created", { label: "Rápido" }, "user-9");
    expect(inserts).toEqual([
      {
        actor_id: "user-1",
        target_user_id: "user-9",
        action: "admin_access_code_created",
        details: { label: "Rápido" },
      },
    ]);
  });

  it("usa alvo nulo e detalhes vazios por padrão", async () => {
    const { context, inserts } = makeContext({ admin: true });
    await auditLog(context, "plan_config_updated");
    expect(inserts[0]).toMatchObject({ target_user_id: null, details: {} });
  });
});
