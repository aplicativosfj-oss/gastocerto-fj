import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminGetIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);
    
    // Simulação de busca de configurações de integração
    // Em um cenário real, isso viria de uma tabela 'integration_settings'
    return {
      mercadopago: {
        active: true,
        mode: "transparent",
        webhook_configured: true,
        last_sync: new Date().toISOString()
      },
      gemini: {
        active: true,
        model: "gemini-2.0-flash",
        economy_mode: true
      },
      email: {
        provider: "resend",
        verified_domain: "gastocerto.com.br"
      }
    };
  });
