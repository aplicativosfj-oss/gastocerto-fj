import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin-guard";
import { resolvePlanAccess, trialDaysForSlug } from "@/lib/plan-features";

const trialSchema = z.object({
  slug: z.enum(["trial_7", "trial_15", "trial_30"]),
});

const adminTrialSchema = z.object({
  targetUserId: z.string().uuid(),
  slug: z.enum(["trial_7", "trial_15", "trial_30"]),
  restart: z.boolean().optional(),
});

/** Plano, nível de acesso e período de teste do usuário autenticado. */
export const getPlanAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profile, licenses, admin] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "plan_id, trial_plan_slug, trial_started_at, trial_ends_at, plans(slug, tier, monthly_price, annual_price)",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("licenses").select("status, expires_at, source, amount").eq("user_id", userId),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (profile?.data ?? null) as any;
    const plan = row?.plans ?? null;
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasPaidLicense = ((licenses?.data ?? []) as any[]).some(
      (license) =>
        String(license.status ?? "").toLowerCase() === "active" &&
        Number(license.amount ?? 0) > 0 &&
        (!license.expires_at || new Date(license.expires_at).getTime() > now.getTime()),
    );

    const access = resolvePlanAccess({
      planSlug: plan?.slug ?? "free",
      planTier: plan?.tier ?? null,
      planPrice: Math.max(Number(plan?.monthly_price ?? 0), Number(plan?.annual_price ?? 0)),
      trialEndsAt: row?.trial_ends_at ?? null,
      hasPaidLicense,
      isAdmin: admin?.data === true,
      now,
    });

    return {
      ...access,
      trialUsed: Boolean(row?.trial_started_at),
      trialPlanSlug: row?.trial_plan_slug ?? null,
    };
  });

/** Ativa o período de teste (uma única vez por conta). */
export const startTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => trialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_started_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.trial_started_at) {
      throw new Error("Você já utilizou seu período de teste. Assine para liberar tudo novamente.");
    }

    const days = trialDaysForSlug(data.slug) ?? 7;
    const now = new Date();
    const ends = new Date(now.getTime() + days * 86_400_000);

    const { data: plan } = await supabase
      .from("plans")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    const { error } = await supabase
      .from("profiles")
      .update({
        plan_id: plan?.id ?? null,
        trial_plan_slug: data.slug,
        trial_started_at: now.toISOString(),
        trial_ends_at: ends.toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw new Error("Não foi possível ativar o período de teste");

    return { ok: true, days, endsAt: ends.toISOString() };
  });

/** Administrador concede (ou reinicia) um período de teste para um usuário. */
export const adminGrantTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminTrialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = trialDaysForSlug(data.slug) ?? 7;
    const now = new Date();
    const ends = new Date(now.getTime() + days * 86_400_000);

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan_id: plan?.id ?? null,
        trial_plan_slug: data.slug,
        trial_started_at: now.toISOString(),
        trial_ends_at: ends.toISOString(),
      })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error("Não foi possível conceder o período de teste");

    await supabase.from("admin_logs").insert({
      actor_id: userId,
      target_user_id: data.targetUserId,
      action: "grant_trial",
      details: { slug: data.slug, days, ends_at: ends.toISOString() },
    });

    return { ok: true, days, endsAt: ends.toISOString() };
  });
