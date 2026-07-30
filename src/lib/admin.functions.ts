import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Garante que o chamador tem papel de administrador antes de qualquer ação privilegiada. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível validar as permissões");
  if (!data) throw new Error("Acesso restrito a administradores");
}

const pinSchema = z.object({
  targetUserId: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/),
});

/** Redefine a senha numérica de um usuário (suporte). */
export const adminResetUserPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pinSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.pin,
    });
    if (error) throw new Error("Não foi possível redefinir a senha");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "reset_password",
      details: { method: "pin" },
    });

    return { ok: true };
  });

const statusSchema = z.object({
  targetUserId: z.string().uuid(),
  status: z.enum(["active", "suspended", "canceled"]),
});

/** Ativa, suspende ou cancela o acesso de um usuário. */
export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error("Não foi possível atualizar a situação");

    if (data.status !== "active") {
      await supabaseAdmin.auth.admin.signOut(data.targetUserId).catch(() => undefined);
    }

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "set_status",
      details: { status: data.status },
    });

    return { ok: true };
  });

const roleSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(["user", "admin", "support"]),
  grant: z.boolean(),
});

/** Concede ou remove um papel administrativo. */
export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.targetUserId === context.userId && data.role === "admin" && !data.grant) {
      throw new Error("Você não pode remover o seu próprio acesso de administrador");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: data.targetUserId, role: data.role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw new Error("Não foi possível conceder o papel");
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .eq("role", data.role);
      if (error) throw new Error("Não foi possível remover o papel");
    }

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: data.grant ? "grant_role" : "revoke_role",
      details: { role: data.role },
    });

    return { ok: true };
  });

const notesSchema = z.object({
  targetUserId: z.string().uuid(),
  notes: z.string().max(2000),
});

/** Salva anotações internas de suporte no perfil do usuário. */
export const adminSaveSupportNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => notesSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ support_notes: data.notes || null })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error("Não foi possível salvar a anotação");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "support_notes",
      details: {},
    });

    return { ok: true };
  });

/** Métricas agregadas da plataforma para o painel administrativo. */
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [users, active, transactions, recent] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString()),
    ]);

    return {
      totalUsers: users.count ?? 0,
      activeUsers: active.count ?? 0,
      totalTransactions: transactions.count ?? 0,
      newUsers30d: recent.count ?? 0,
    };
  });
