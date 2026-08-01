import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin-guard";
import {
  CLOSING_POLICY_SETTING_KEY,
  ClosingPolicySchema,
  DEFAULT_CLOSING_POLICY,
  normalizeClosingPolicy,
  type ClosingPolicy,
} from "@/lib/closing-policy";

/** Política atual de fechamento (leitura para qualquer usuário logado). */
export const getClosingPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClosingPolicy> => {
    try {
      const { data } = await context.supabase
        .from("app_settings")
        .select("value")
        .eq("key", CLOSING_POLICY_SETTING_KEY)
        .maybeSingle();
      return normalizeClosingPolicy(data?.value);
    } catch {
      return DEFAULT_CLOSING_POLICY;
    }
  });

/** Administrador liga/desliga o bloqueio de meses anteriores. */
export const saveClosingPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClosingPolicySchema.parse(input))
  .handler(async ({ data, context }): Promise<ClosingPolicy> => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const policy = normalizeClosingPolicy(data);
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: CLOSING_POLICY_SETTING_KEY,
        value: policy,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error("Não foi possível salvar a política de fechamento");

    await supabase.from("admin_logs").insert({
      actor_id: userId,
      action: "update_closing_policy",
      details: policy,
    });

    return policy;
  });
