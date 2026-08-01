import { describe, expect, it, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const getUser = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args), auth: { getUser: () => getUser() } },
}));

const { resolveHomeRoute, resolveHomeRouteForSession } = await import("@/lib/post-login");

function roles(map: Record<string, boolean>) {
  rpc.mockImplementation(async (_fn: string, args: { _role: string }) => ({
    data: Boolean(map[args._role]),
    error: null,
  }));
}

beforeEach(() => {
  rpc.mockReset();
  getUser.mockReset();
});

describe("resolveHomeRoute", () => {
  it("manda administradores para o painel administrativo", async () => {
    roles({ admin: true });
    await expect(resolveHomeRoute("user-1")).resolves.toBe("/admin");
  });

  it("manda suporte para o painel administrativo", async () => {
    roles({ support: true });
    await expect(resolveHomeRoute("user-1")).resolves.toBe("/admin");
  });

  it("manda clientes para o painel do cliente", async () => {
    roles({});
    await expect(resolveHomeRoute("user-1")).resolves.toBe("/painel");
  });

  it("sem usuário autenticado não expõe o painel administrativo", async () => {
    await expect(resolveHomeRoute(null)).resolves.toBe("/painel");
    await expect(resolveHomeRoute(undefined)).resolves.toBe("/painel");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falha fechado quando a checagem de papel quebra", async () => {
    rpc.mockRejectedValue(new Error("offline"));
    await expect(resolveHomeRoute("user-1")).resolves.toBe("/painel");
  });
});

describe("resolveHomeRouteForSession", () => {
  it("usa o usuário da sessão corrente", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    roles({ admin: true });
    await expect(resolveHomeRouteForSession()).resolves.toBe("/admin");
  });

  it("sem sessão vai para o painel do cliente", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(resolveHomeRouteForSession()).resolves.toBe("/painel");
  });
});
