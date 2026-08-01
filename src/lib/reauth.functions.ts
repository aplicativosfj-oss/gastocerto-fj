import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cpfFromLoginEmail, pinToPassword } from "@/lib/cpf";

/**
 * Reconfirma a senha do próprio usuário sem trocar a sessão do navegador.
 * A validação usa sempre o e-mail real da conta (login por CPF gera um e-mail
 * técnico), evitando o falso "senha incorreta" quando o cliente cadastrou
 * um e-mail de contato diferente.
 */
export const verifyMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ password: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason?: string }> => {
    const { data: userData } = await context.supabase.auth.getUser();
    const email = userData?.user?.email;
    if (!email) return { ok: false, reason: "Conta sem e-mail de acesso." };

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return { ok: false, reason: "Serviço de autenticação indisponível." };

    const client = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const cpf = cpfFromLoginEmail(email);
    const authenticationPassword = cpf
      ? pinToPassword(cpf, data.password)
      : data.password;

    const { data: signIn, error } = await client.auth.signInWithPassword({
      email,
      password: authenticationPassword,
    });
    if (signIn?.session) {
      await client.auth.signOut();
    }
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("invalid login")) return { ok: false, reason: "Senha incorreta." };
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  });
