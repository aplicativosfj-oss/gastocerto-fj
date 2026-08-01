import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Limpa todos os logs de auditoria administrativa.
 * Ação extrema permitida apenas para administradores reais.
 */
export const adminClearAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Registra a intenção de limpar antes de apagar, se possível, 
    // ou apenas deleta tudo.
    const { error } = await supabaseAdmin
      .from("admin_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Deleta todos

    if (error) throw error;

    // Registra a ação de limpeza após o delete (o log será o único existente)
    await supabaseAdmin.from("admin_logs").insert({
      actor_id: context.userId,
      action: "audit_logs_cleared",
      details: { timestamp: new Date().toISOString() }
    });

    return { ok: true };
  });
