/** Helpers server-only para validar permissões e registrar auditoria. */

export async function assertAdminCtx(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível validar as permissões");
  if (!data) throw new Error("Acesso restrito a administradores");
}

export async function assertStaffCtx(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { data: isSupport } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "support",
  });
  if (!isAdmin && !isSupport) throw new Error("Acesso negado");
  return { isAdmin: Boolean(isAdmin), isSupport: Boolean(isSupport) };
}

/** Registra uma ação administrativa na trilha de auditoria. */
export async function auditLog(
  context: { supabase: any; userId: string },
  action: string,
  details: Record<string, unknown> = {},
  targetUserId: string | null = null,
) {
  await context.supabase.from("admin_logs").insert({
    actor_id: context.userId,
    target_user_id: targetUserId,
    action,
    details,
  });
}
