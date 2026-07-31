import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin-guard";
import { AI_LIMITS_SETTING_KEY, AiLimitsSchema, normalizeAiLimits } from "@/lib/ai-limits";
import { loadAiLimits } from "@/lib/ai-guard";

/** Limites atuais do Consultor de IA (leitura para qualquer usuário logado). */
export const getAiLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return loadAiLimits(context.supabase);
  });

/** Administrador ajusta rate limiting, cota mensal e threshold do alerta. */
export const saveAiLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AiLimitsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const limits = normalizeAiLimits(data);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: AI_LIMITS_SETTING_KEY,
          value: limits,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: "key" },
      );
    if (error) throw new Error("Não foi possível salvar os limites da IA");

    await supabase.from("admin_logs").insert({
      actor_id: userId,
      action: "update_ai_limits",
      details: limits,
    });

    return limits;
  });
