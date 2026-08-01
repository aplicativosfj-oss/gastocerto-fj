import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isCourtesyTrialLicense, TRIAL_GIFT_PLAN_SLUG, TRIAL_GIFT_SOURCE } from "@/lib/license-status";

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

    const { data: chosenPlan } = await supabaseAdmin
      .from("plans")
      .select("slug, trial_days, monthly_price, annual_price")
      .eq("id", data.planId)
      .maybeSingle();

    // Backend: teste de cortesia nunca é ativado pelo admin nem libera IA.
    const courtesy = isCourtesyTrialLicense({
      source: data.amount <= 0 ? TRIAL_GIFT_SOURCE : "manual",
      amount: data.amount,
      planSlug: chosenPlan?.slug ?? null,
    });
    if (courtesy && data.activateNow) {
      throw new Error(
        "Licenças de teste só entram em vigor quando o cliente ativa a chave no site ou aplicativo.",
      );
    }

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
  trialDays: z.union([z.literal(7), z.literal(15), z.literal(30)]).optional(),
  notes: z.string().max(300).optional(),
});

/**
 * Gera licenças de teste (7, 15 ou 30 dias, recursos limitados e sem IA) para o
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
      .eq("slug", TRIAL_GIFT_PLAN_SLUG)
      .maybeSingle();
    if (!plan) throw new Error("Plano de teste de 7 dias não encontrado");

    const days = data.trialDays ?? plan.trial_days ?? 7;

    const rows = Array.from({ length: data.quantity }).map(() => ({
      plan_id: plan.id,
      billing_cycle: "monthly" as const,
      amount: 0,
      source: TRIAL_GIFT_SOURCE,
      status: "pending" as const,
      trial_days: days,
      created_by: context.userId,
      notes:
        data.notes ||
        `Licença de teste ${days} dias — recursos limitados, sem IA`,
    }));

    const { data: created, error } = await supabaseAdmin
      .from("licenses")
      .insert(rows)
      .select("id, license_key, status, created_at, notes, trial_days");
    if (error) throw new Error("Não foi possível gerar as licenças de teste");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: null,
      action: "trial_licenses_created",
      details: { quantity: data.quantity, trial_days: days },
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
      .select("*, plans(slug, name, tier, monthly_price, annual_price, trial_days)")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!license) throw new Error("Licença não encontrada");

    // Licença de teste de cortesia só entra em vigor quando o próprio cliente
    // ativa a chave no site/app — o admin não pode ligá-la manualmente.
    if (
      data.status === "active" &&
      isCourtesyTrialLicense({
        source: license.source,
        amount: license.amount,
        planSlug: license.plans?.slug ?? null,
      }) &&
      !license.user_id
    ) {
      throw new Error(
        "Licenças de teste de 7 dias só entram em vigor quando o cliente ativa a chave no site ou aplicativo.",
      );
    }

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
        .select(
          "*, plans(name, slug, tier, monthly_price, annual_price, trial_days)",
        )
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
    if (license.status === "expired") throw new Error("Esta licença já expirou");
    if (license.user_id && license.user_id !== context.userId) {
      throw new Error("Esta licença já está vinculada a outra conta");
    }
    if (
      license.expires_at &&
      new Date(license.expires_at).getTime() <= Date.now() &&
      license.status === "active"
    ) {
      throw new Error("Esta licença já expirou");
    }

    const { data: plan } = license.plan_id
      ? await supabaseAdmin
          .from("plans")
          .select("id, slug, trial_days")
          .eq("id", license.plan_id)
          .maybeSingle()
      : { data: null };

    const now = new Date();
    const courtesy = isCourtesyTrialLicense({
      source: license.source,
      amount: license.amount,
      planSlug: plan?.slug ?? null,
    });
    const trialDays =
      courtesy || Number(license.amount) === 0
        ? (license.trial_days ?? plan?.trial_days ?? 7)
        : null;

    // Teste de cortesia: a validade SEMPRE começa a contar no momento em que o
    // cliente ativa a chave (nunca antes) e nunca libera a IA.
    const expiresAt = trialDays
      ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
      : addMonths(now, monthsFromCycle(license.billing_cycle));

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({
        user_id: context.userId,
        status: "active",
        activated_at: license.activated_at ?? now.toISOString(),
        expires_at: trialDays
          ? expiresAt.toISOString()
          : (license.expires_at ?? expiresAt.toISOString()),
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
                trial_plan_slug: plan?.slug ?? TRIAL_GIFT_PLAN_SLUG,
                trial_started_at: now.toISOString(),
                trial_ends_at: expiresAt.toISOString(),
              }
            : {}),
        })
        .eq("user_id", context.userId);
    }

    await supabaseAdmin.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: context.userId,
      action: "license_activated",
      details: {
        license_key: key,
        courtesy_trial: courtesy,
        ai_enabled: !courtesy && !trialDays,
        trial_days: trialDays,
        expires_at: expiresAt.toISOString(),
      },
    });

    return {
      ok: true,
      licenseKey: key,
      trialDays,
      aiEnabled: !courtesy && !trialDays,
      expiresAt: expiresAt.toISOString(),
    };
  });

/**
 * Exclui uma licença (ação definitiva para limpeza ou correção).
 */
export const adminDeleteLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("license_key, email, user_id")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("licenses").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir a licença");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      target_user_id: license?.user_id ?? null,
      action: "license_deleted",
      details: { license_key: license?.license_key, email: license?.email },
    });

    return { ok: true };
  });

/**
 * Exclui um código de acesso administrativo.
 */
export const adminDeleteAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: code } = await supabaseAdmin
      .from("admin_access_codes")
      .select("code, label")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("admin_access_codes").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir o código");

    await context.supabase.from("admin_logs").insert({
      actor_id: context.userId,
      action: "admin_code_deleted",
      details: { code: code?.code, label: code?.label },
    });

    return { ok: true };
  });
