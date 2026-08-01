/**
 * Cálculo do nível de acesso do usuário no servidor.
 *
 * Fica fora de `plan.functions.ts` porque módulos de server function precisam
 * conter apenas as declarações (o restante vaza para o bundle do cliente).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolvePlanAccess, type PlanAccess } from "@/lib/plan-features";

export type PlanAccessResult = PlanAccess & {
  trialUsed: boolean;
  trialPlanSlug: string | null;
};

/** Lê perfil, licenças e papel do usuário e resolve o plano vigente. */
export async function loadPlanAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<PlanAccessResult> {
  const [profile, licenses, admin] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "plan_id, trial_plan_slug, trial_started_at, trial_ends_at, plans(slug, tier, monthly_price, annual_price)",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("licenses")
      .select("status, expires_at, source, amount, plans(slug)")
      .eq("user_id", userId),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (profile?.data ?? null) as any;
  const plan = row?.plans ?? null;
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (licenses?.data ?? []) as any[];

  const paidLicense = rows.find(
    (license) =>
      String(license.status ?? "").toLowerCase() === "active" &&
      Number(license.amount ?? 0) > 0 &&
      (!license.expires_at || new Date(license.expires_at).getTime() > now.getTime()),
  );

  const hasPaidLicense = rows.some(
    (license) =>
      String(license.status ?? "").toLowerCase() === "active" &&
      Number(license.amount ?? 0) > 0 &&
      (!license.expires_at || new Date(license.expires_at).getTime() > now.getTime()),
  );

  // Licença de cortesia (teste) ainda vigente também mantém a escrita liberada.
  const hasValidCourtesyLicense = rows.some(
    (license) =>
      String(license.status ?? "").toLowerCase() === "active" &&
      Boolean(license.expires_at) &&
      new Date(license.expires_at).getTime() > now.getTime(),
  );

  const access = resolvePlanAccess({
    planSlug: plan?.slug ?? "free",
    planTier: plan?.tier ?? null,
    planPrice: Math.max(Number(plan?.monthly_price ?? 0), Number(plan?.annual_price ?? 0)),
    trialEndsAt: row?.trial_ends_at ?? null,
    trialPlanSlug: row?.trial_plan_slug ?? null,
    hasPaidLicense,
    paidPlanSlug: paidLicense?.plans?.slug ?? plan?.slug ?? null,
    isAdmin: admin?.data === true,
    now,
  });

  const readOnly = access.readOnly && !hasValidCourtesyLicense;

  return {
    ...access,
    readOnly,
    readOnlyReason: readOnly ? access.readOnlyReason : null,
    trialUsed: Boolean(row?.trial_started_at),
    trialPlanSlug: row?.trial_plan_slug ?? null,
  };
}
