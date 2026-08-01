/**
 * Verificação de e-mail antes de qualquer registro de compra.
 *
 * Nenhuma licença, pagamento ou perfil é criado antes de o cliente confirmar o
 * código de 6 dígitos enviado para o e-mail informado. Isso evita registros
 * órfãos no banco quando a emissão do Pix falha ou o cliente desiste.
 *
 * Arquivo somente de servidor: nunca importar pela interface.
 */
import { createHash, randomInt } from "crypto";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 6;

function hashCode(code: string, salt: string) {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export type VerificationRequest = {
  planSlug: "premium" | "premium_ia";
  cycle: "monthly" | "annual";
  fullName: string;
  email: string;
  cpf: string;
};

/** Cria o desafio de e-mail e tenta enviar o código. */
export async function createEmailVerification(input: VerificationRequest) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendVerificationCodeEmail } = await import("@/lib/license-delivery.server");

  const email = input.email.trim().toLowerCase();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

  const { data: row, error } = await supabaseAdmin
    .from("checkout_verifications")
    .insert({
      email,
      cpf: input.cpf,
      full_name: input.fullName,
      plan_slug: input.planSlug,
      billing_cycle: input.cycle,
      code_hash: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error("Não foi possível iniciar a verificação do e-mail.");

  await supabaseAdmin
    .from("checkout_verifications")
    .update({ code_hash: hashCode(code, row.id as string) })
    .eq("id", row.id);

  const delivery = await sendVerificationCodeEmail({
    to: email,
    fullName: input.fullName,
    code,
    minutes: CODE_TTL_MINUTES,
  });

  return {
    verificationId: row.id as string,
    email,
    expiresAt,
    emailDelivered: delivery.delivered,
    deliveryReason: delivery.reason ?? null,
    // Quando o domínio remetente ainda não está configurado, o código é exibido
    // na própria tela para o cliente não ficar bloqueado (mesmo critério já
    // usado na entrega da chave de ativação).
    fallbackCode: delivery.delivered ? null : code,
  };
}

/** Confere o código informado e marca a verificação como concluída. */
export async function confirmEmailVerification(verificationId: string, code: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row } = await supabaseAdmin
    .from("checkout_verifications")
    .select("id, code_hash, attempts, expires_at, verified_at, consumed_at")
    .eq("id", verificationId)
    .maybeSingle();
  if (!row) throw new Error("Verificação não encontrada. Recomece o cadastro.");
  if (row.consumed_at) throw new Error("Esta verificação já foi utilizada.");
  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    throw new Error("O código expirou. Solicite um novo.");
  }
  if (Number(row.attempts) >= MAX_ATTEMPTS) {
    throw new Error("Muitas tentativas. Solicite um novo código.");
  }

  const ok = hashCode(code.trim(), verificationId) === row.code_hash;
  await supabaseAdmin
    .from("checkout_verifications")
    .update({
      attempts: Number(row.attempts) + 1,
      ...(ok ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq("id", verificationId);

  if (!ok) throw new Error("Código incorreto. Confira o e-mail e tente novamente.");
  return { ok: true as const };
}

/** Garante que a verificação existe, está confirmada e corresponde aos dados. */
export async function requireVerifiedCheckout(input: {
  verificationId: string;
  email: string;
  cpf: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row } = await supabaseAdmin
    .from("checkout_verifications")
    .select("id, email, cpf, verified_at, consumed_at, expires_at")
    .eq("id", input.verificationId)
    .maybeSingle();
  if (!row) throw new Error("Verificação não encontrada. Recomece o cadastro.");
  if (!row.verified_at) throw new Error("Confirme o código enviado ao seu e-mail antes de pagar.");
  if (row.consumed_at) throw new Error("Esta verificação já gerou um pedido.");
  if (String(row.email).toLowerCase() !== input.email.toLowerCase() || String(row.cpf) !== input.cpf) {
    throw new Error("Os dados informados não conferem com a verificação.");
  }
  return row;
}

/** Marca a verificação como usada depois que o pedido é criado com sucesso. */
export async function consumeVerification(verificationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("checkout_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", verificationId);
}
