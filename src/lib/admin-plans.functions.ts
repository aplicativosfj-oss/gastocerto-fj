import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { data, error } = await context.supabase
      .from("plans")
      .select("id, name, slug, tier, description, monthly_price, annual_price, transaction_limit, vehicle_limit, trial_days, active")
      .order("monthly_price", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpdatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(60).optional(),
        monthlyPrice: z.number().min(0).max(9999),
        annualPrice: z.number().min(0).max(99999),
        active: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    const { normalizePlanPrices } = await import("@/lib/plan-pricing");
    await assertAdminCtx(context);

    // Arredondamento oficial: mensal em centavos e anual múltiplo de 12,
    // para o equivalente mensal nunca sair quebrado (ex.: 29,08).
    const prices = normalizePlanPrices({ monthly: data.monthlyPrice, annual: data.annualPrice });

    const { data: before } = await context.supabase
      .from("plans")
      .select("name, slug, monthly_price, annual_price, active")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("plans")
      .update({
        monthly_price: prices.monthly,
        annual_price: prices.annual,
        active: data.active,
        ...(data.name ? { name: data.name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;

    await auditLog(context, "plan_updated", {
      plan_id: data.id,
      plan_slug: before?.slug ?? null,
      before: before
        ? {
            name: before.name,
            monthly_price: Number(before.monthly_price),
            annual_price: Number(before.annual_price),
            active: before.active,
          }
        : null,
      after: {
        name: data.name ?? before?.name ?? null,
        monthly_price: prices.monthly,
        annual_price: prices.annual,
        active: data.active,
      },
      rounding_adjusted: prices.adjusted,
      monthly_equivalent: prices.monthlyEquivalent,
    });

    if (before && before.active !== data.active) {
      await auditLog(context, data.active ? "plan_activated" : "plan_deactivated", {
        plan_id: data.id,
        plan_slug: before.slug,
      });
    }

    return {
      ok: true,
      monthlyPrice: prices.monthly,
      annualPrice: prices.annual,
      monthlyEquivalent: prices.monthlyEquivalent,
      savingsPercent: prices.savingsPercent,
      adjusted: prices.adjusted,
    };
  });


export const adminGetOwnContact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { data, error } = await context.supabase
      .from("profiles")
      .select("full_name, contact_email, phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? { full_name: null, contact_email: null, phone: null };
  });

export const adminUpdateOwnContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        contactEmail: z.string().trim().email({ message: "Informe um e-mail válido" }).max(255),
        phone: z.string().trim().max(30).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { error } = await context.supabase
      .from("profiles")
      .update({
        contact_email: data.contactEmail,
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw error;

    await auditLog(context, "admin_contact_email_updated", { contact_email: data.contactEmail });
    return { ok: true };
  });
