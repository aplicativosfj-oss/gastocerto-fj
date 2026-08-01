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
    await assertAdminCtx(context);

    const payload: Record<string, unknown> = {
      monthly_price: data.monthlyPrice,
      annual_price: data.annualPrice,
      active: data.active,
      updated_at: new Date().toISOString(),
    };
    if (data.name) payload["name"] = data.name;

    const { error } = await context.supabase.from("plans").update(payload).eq("id", data.id);
    if (error) throw error;

    await auditLog(context, "plan_updated", {
      plan_id: data.id,
      monthly_price: data.monthlyPrice,
      annual_price: data.annualPrice,
      active: data.active,
      name: data.name ?? null,
    });

    return { ok: true };
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
