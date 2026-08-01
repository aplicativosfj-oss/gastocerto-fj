import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Acesso administrativo por código secreto único.
 * No ambiente real, esse segredo deve ser configurado nas env vars.
 */
export const adminAccessByCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => 
    z.object({ code: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    // O segredo do administrador. 
    // Em produção: process.env['ADMIN_ACCESS_SECRET']
    const secret = "ADMIN123456";
    
    if (data.code.trim().toUpperCase() !== secret) {
      throw new Error("Código administrativo inválido.");
    }

    return { success: true };
  });
