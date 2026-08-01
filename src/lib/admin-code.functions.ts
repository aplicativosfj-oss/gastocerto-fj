import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Acesso administrativo por código secreto único com logs e expiração.
 */
export const adminAccessByCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();

    const code = data.code.trim().toUpperCase();

    const { data: accessCode, error } = await supabaseAdmin
      .from("admin_access_codes")
      .select("*")
      .eq("code", code)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !accessCode) {
      throw new Error("Código administrativo inválido, expirado ou revogado.");
    }

    if (accessCode.usage_count >= accessCode.max_uses) {
      throw new Error("Este código atingiu o limite máximo de utilizações.");
    }

    const userAgent = request.headers.get("user-agent");
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : null;

    await supabaseAdmin.from("admin_access_logs").insert({
      code_id: accessCode.id,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    });

    await supabaseAdmin
      .from("admin_access_codes")
      .update({ usage_count: accessCode.usage_count + 1 })
      .eq("id", accessCode.id);

    return { success: true, label: accessCode.label };
  });

/**
 * Lista todos os códigos de acesso (apenas equipe).
 */
export const listAdminAccessCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaffCtx } = await import("@/lib/admin-guard.server");
    await assertStaffCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_access_codes")
      .select(`*, admin_access_logs(count)`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  });

/**
 * Gera um novo código de acesso.
 */
export const createAdminAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        label: z.string().min(3),
        expiresInDays: z.number().min(1).max(365),
        maxUses: z.number().min(1).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `ADM-${random}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    const { data: newCode, error } = await supabaseAdmin
      .from("admin_access_codes")
      .insert({
        code,
        label: data.label,
        expires_at: expiresAt.toISOString(),
        max_uses: data.maxUses,
      })
      .select()
      .single();

    if (error) throw error;

    await auditLog(context, "admin_code_created", {
      code,
      label: data.label,
      expires_at: expiresAt.toISOString(),
      max_uses: data.maxUses,
    });

    return newCode;
  });

/**
 * Revoga um código.
 */
export const revokeAdminAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: revoked, error } = await supabaseAdmin
      .from("admin_access_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("code, label")
      .maybeSingle();

    if (error) throw error;

    await auditLog(context, "admin_code_revoked", {
      code: revoked?.code ?? null,
      label: revoked?.label ?? null,
    });

    return { success: true };
  });

/**
 * Busca logs de uso.
 */
export const getAdminAccessLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ codeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertStaffCtx } = await import("@/lib/admin-guard.server");
    await assertStaffCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: logs, error } = await supabaseAdmin
      .from("admin_access_logs")
      .select("*")
      .eq("code_id", data.codeId)
      .order("used_at", { ascending: false });

    if (error) throw error;
    return logs;
  });
