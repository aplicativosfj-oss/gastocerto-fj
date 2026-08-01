import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin-guard";
import { loadPlanAccess } from "@/lib/plan-access.server";
import { trialDaysForSlug } from "@/lib/plan-features";

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
  .handler(async ({ context }) => loadPlanAccess(context.supabase, context.userId));

/**
 * Guarda de escrita: recusa a operação quando o teste/licença venceu e não há
 * plano pago. Chamada pelas mutações do app antes de gravar no banco.
 */
export const assertWriteAllowed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await loadPlanAccess(context.supabase, context.userId);
    if (access.readOnly) {
      throw new Error(access.readOnlyReason ?? "Conta em modo somente leitura.");
    }
    return { ok: true as const };
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
