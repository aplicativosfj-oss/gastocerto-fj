import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Define permissões específicas para usuários staff.
 * Em um cenário real, isso seria persistido em uma tabela 'staff_permissions'.
 */
export const adminUpdateStaffPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ 
    targetUserId: z.string(), 
    permissions: z.record(z.boolean()) 
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Simulação de persistência
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ details: { permissions: data.permissions } } as any)
      .eq("user_id", data.targetUserId);

    if (error) throw error;

    await auditLog(context, "staff_permissions_updated", { 
      target_user_id: data.targetUserId,
      permissions: data.permissions 
    }, data.targetUserId);

    return { ok: true };
  });
