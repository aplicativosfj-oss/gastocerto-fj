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

function monthsFromCycle(cycle: string) {
  return cycle === "annual" ? 12 : 1;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

const createSchema = z.object({
  planId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().max(120).optional(),
  cpf: z.string().max(14).optional(),
  billingCycle: z.enum(["monthly", "annual"]),
  amount: z.number().min(0).max(100000),
  activateNow: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

/** Emite uma licença manual (usada até a automação do Mercado Pago entrar no ar). */
export const adminCreateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("contact_email", email)
      .maybeSingle();

    const now = new Date();
    const months = monthsFromCycle(data.billingCycle);

    const { data: license, error } = await supabaseAdmin
      .from("licenses")
      .insert({
        plan_id: data.planId,
        email,
        full_name: data.fullName || null,
        cpf: data.cpf || null,
        billing_cycle: data.billingCycle,
        amount: data.amount,
        notes: data.notes || null,
        source: "manual",
        created_by: context.userId,
        status: data.activateNow ? "active" : "pending",
        user_id: data.activateNow ? (profile?.user_id ?? null) : null,
        activated_at: data.activateNow ? now.toISOString() : null,
        expires_at: data.activateNow ? addMonths(now, months).toISOString() : null,
      })
      .select("*")
      .single();

    if (error) throw new Error("Não foi possível emitir a licença");

    if (data.activateNow && profile?.user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ plan_id: data.planId, status: "active" })
        .eq("user_id", profile.user_id);
    }

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: profile?.user_id ?? null,
      action: "license_created",
      details: { license_key: license.license_key, email, cycle: data.billingCycle },
    });

    return license;
  });

const trialBatchSchema = z.object({
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(300).optional(),
});

/**
 * Gera licenças de teste (7 dias, recursos limitados e sem IA) para o
 * administrador distribuir. Elas ficam pendentes e só passam a valer quando o
 * cliente ativa a chave dentro do app.
 */
export const adminCreateTrialLicenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => trialBatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, name, trial_days")
      .eq("slug", "trial_7_basic")
      .maybeSingle();
    if (!plan) throw new Error("Plano de teste de 7 dias não encontrado");

    const rows = Array.from({ length: data.quantity }).map(() => ({
      plan_id: plan.id,
      billing_cycle: "monthly" as const,
      amount: 0,
      source: "trial_gift",
      status: "pending" as const,
      created_by: context.userId,
      notes: data.notes || "Licença de teste 7 dias — recursos limitados, sem IA",
    }));

    const { data: created, error } = await supabaseAdmin
      .from("licenses")
      .insert(rows)
      .select("id, license_key, status, created_at, notes");
    if (error) throw new Error("Não foi possível gerar as licenças de teste");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: null,
      action: "trial_licenses_created",
      details: { quantity: data.quantity },
    });

    return created ?? [];
  });

const statusSchema = z.object({
  licenseId: z.string().uuid(),
  status: z.enum(["pending", "active", "expired", "revoked"]),
});

/** Altera a situação de uma licença (ativar, revogar, expirar). */
export const adminSetLicenseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!license) throw new Error("Licença não encontrada");

    const now = new Date();
    const patch: {
      status: "pending" | "active" | "expired" | "revoked";
      activated_at?: string;
      expires_at?: string;
    } = { status: data.status };
    if (data.status === "active") {
      patch.activated_at = license.activated_at ?? now.toISOString();
      patch.expires_at = addMonths(now, monthsFromCycle(license.billing_cycle)).toISOString();
    }


    const { error } = await supabaseAdmin.from("licenses").update(patch).eq("id", data.licenseId);
    if (error) throw new Error("Não foi possível atualizar a licença");

    if (license.user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ status: data.status === "revoked" ? "suspended" : "active" })
        .eq("user_id", license.user_id);
    }

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: license.user_id,
      action: "license_status",
      details: { license_key: license.license_key, status: data.status },
    });

    return { ok: true };
  });

/** Lista licenças e pagamentos para o painel administrativo. */
export const adminListLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [licenses, payments] = await Promise.all([
      supabaseAdmin
        .from("licenses")
        .select("*, plans(name, slug)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    return {
      licenses: licenses.data ?? [],
      payments: payments.data ?? [],
    };
  });

const activateSchema = z.object({ licenseKey: z.string().min(6).max(32) });

/** Cliente ativa uma licença informando a chave recebida por e-mail. */
export const activateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = data.licenseKey.trim().toUpperCase();

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("license_key", key)
      .maybeSingle();

    if (!license) throw new Error("Chave de licença inválida");
    if (license.status === "revoked") throw new Error("Licença revogada");
    if (license.user_id && license.user_id !== context.userId) {
      throw new Error("Esta licença já está vinculada a outra conta");
    }

    const { data: plan } = license.plan_id
      ? await supabaseAdmin
          .from("plans")
          .select("id, slug, trial_days")
          .eq("id", license.plan_id)
          .maybeSingle()
      : { data: null };

    const now = new Date();
    const trialDays = Number(license.amount) === 0 ? (plan?.trial_days ?? null) : null;
    const expiresAt = trialDays
      ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
      : addMonths(now, monthsFromCycle(license.billing_cycle));

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({
        user_id: context.userId,
        status: "active",
        activated_at: license.activated_at ?? now.toISOString(),
        expires_at: license.expires_at ?? expiresAt.toISOString(),
      })
      .eq("id", license.id);
    if (error) throw new Error("Não foi possível ativar a licença");

    if (license.plan_id) {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan_id: license.plan_id,
          status: "active",
          ...(trialDays
            ? {
                trial_plan_slug: plan?.slug ?? null,
                trial_started_at: now.toISOString(),
                trial_ends_at: expiresAt.toISOString(),
              }
            : {}),
        })
        .eq("user_id", context.userId);
    }

    return { ok: true, licenseKey: key, trialDays, expiresAt: expiresAt.toISOString() };
  });
