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

const profileSchema = z.object({
  targetUserId: z.string().uuid(),
  fullName: z.string().min(2).max(120).optional(),
  contactEmail: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  cpf: z.string().max(14).optional().or(z.literal("")),
  loginEmail: z.string().email().max(160).optional().or(z.literal("")),
});

/** Edita os dados cadastrais do usuário (nome, contato, CPF e e-mail de acesso). */
export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch = {
      ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
      ...(data.contactEmail !== undefined ? { contact_email: data.contactEmail || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.cpf !== undefined ? { cpf: data.cpf.replace(/\D/g, "") || null } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(patch)
        .eq("user_id", data.targetUserId);
      if (error) throw new Error("Não foi possível salvar os dados do usuário");
    }

    if (data.loginEmail) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
        email: data.loginEmail,
        email_confirm: true,
      });
      if (error) throw new Error("Não foi possível alterar o e-mail de acesso");
    }

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "update_user",
      details: { fields: Object.keys(patch), login_email: Boolean(data.loginEmail) },
    });

    return { ok: true };
  });

const passwordSchema = z.object({
  targetUserId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

/** Define uma senha livre (não numérica) para o usuário. */
export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => passwordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.password,
    });
    if (error) throw new Error("Não foi possível definir a nova senha");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "set_password",
      details: { method: "manual" },
    });

    return { ok: true };
  });

const cancelSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

/**
 * Cancela a assinatura: revoga licenças ativas, devolve o usuário ao plano
 * gratuito e encerra qualquer período de teste em andamento.
 */
export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: freePlan } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("slug", "free")
      .maybeSingle();

    const { data: revoked } = await supabaseAdmin
      .from("licenses")
      .update({ status: "revoked" })
      .eq("user_id", data.targetUserId)
      .in("status", ["active", "pending"])
      .select("id");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan_id: freePlan?.id ?? null,
        trial_plan_slug: null,
        trial_started_at: null,
        trial_ends_at: null,
        support_notes: data.reason ? `Cancelamento: ${data.reason}` : undefined,
      })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error("Não foi possível cancelar a assinatura");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "cancel_subscription",
      details: { revoked: revoked?.length ?? 0, reason: data.reason ?? null },
    });

    return { ok: true, revoked: revoked?.length ?? 0 };
  });

const deleteSchema = z.object({
  targetUserId: z.string().uuid(),
  confirmation: z.literal("EXCLUIR"),
});

/** Exclui definitivamente a conta e todos os dados do usuário. */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.targetUserId === context.userId) {
      throw new Error("Você não pode excluir a sua própria conta pelo painel");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, cpf")
      .eq("user_id", data.targetUserId)
      .maybeSingle();

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId,
      action: "delete_user",
      details: { full_name: profile?.full_name ?? null, cpf: profile?.cpf ?? null },
    });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) throw new Error("Não foi possível excluir a conta");

    return { ok: true };
  });

const blockSchema = z.object({
  ip: z.string().min(3).max(64),
  reason: z.string().max(300).optional(),
  targetUserId: z.string().uuid().optional(),
});

/** Bloqueia um IP de acesso à plataforma. */
export const adminBlockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => blockSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("blocked_ips").upsert(
      {
        ip: data.ip.trim(),
        reason: data.reason || null,
        target_user_id: data.targetUserId ?? null,
        created_by: context.userId,
      },
      { onConflict: "ip" },
    );
    if (error) throw new Error("Não foi possível bloquear o IP");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: data.targetUserId ?? null,
      action: "block_ip",
      details: { ip: data.ip, reason: data.reason ?? null },
    });

    return { ok: true };
  });

/** Libera um IP bloqueado. */
export const adminUnblockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("blocked_ips")
      .delete()
      .eq("id", data.id)
      .select("ip")
      .maybeSingle();
    if (error) throw new Error("Não foi possível liberar o IP");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: null,
      action: "unblock_ip",
      details: { ip: row?.ip ?? null },
    });

    return { ok: true };
  });

/** Lista os IPs bloqueados. */
export const adminListBlockedIps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("blocked_ips")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });
