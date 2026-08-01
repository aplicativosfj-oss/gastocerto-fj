import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { isValidCpf, onlyDigits } from "@/lib/cpf";

const startSchema = z.object({
  planSlug: z.enum(["premium", "premium_ia"]),
  cycle: z.enum(["monthly", "annual"]),
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  cpf: z.string().trim().min(11).max(14),
});

/**
 * Inicia o checkout transparente: emite uma licença pendente, cria a cobrança
 * Pix no Mercado Pago e devolve o QR Code para o cliente pagar na hora.
 */
export const startPixCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data }) => {
    const cpf = onlyDigits(data.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido. Confira os 11 dígitos.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPixCharge } = await import("@/lib/mercadopago.server");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, name, slug, monthly_price, annual_price, active")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (!plan || !plan.active) throw new Error("Plano indisponível no momento.");

    // O valor cobrado vem sempre do banco, nunca do navegador.
    const amount = Number(data.cycle === "annual" ? plan.annual_price : plan.monthly_price);
    if (!(amount > 0)) throw new Error("Plano sem preço configurado. Fale com o suporte.");

    const email = data.email.toLowerCase();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .or(`cpf.eq.${cpf},contact_email.ilike.${email}`)
      .maybeSingle();

    const { data: license, error: licenseError } = await supabaseAdmin
      .from("licenses")
      .insert({
        plan_id: plan.id,
        email,
        full_name: data.fullName,
        cpf,
        billing_cycle: data.cycle,
        amount,
        source: "mercadopago_pix",
        status: "pending",
        user_id: profile?.user_id ?? null,
        notes: "Aguardando confirmação do Pix",
      })
      .select("id, license_key")
      .single();
    if (licenseError || !license) throw new Error("Não foi possível iniciar a compra.");

    let charge;
    try {
      charge = await createPixCharge({
        amount,
        description: `GastoCerto ${plan.name} — ${data.cycle === "annual" ? "anual" : "mensal"}`,
        email,
        fullName: data.fullName,
        cpf,
        externalReference: license.id,
      });
    } catch (error) {
      await supabaseAdmin.from("licenses").update({ status: "revoked" }).eq("id", license.id);
      throw error;
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        license_id: license.id,
        user_id: profile?.user_id ?? null,
        email,
        provider: "mercadopago",
        method: "pix",
        external_id: charge.externalId,
        amount,
        status: charge.status,
        qr_code: charge.qrCode,
        qr_code_base64: charge.qrCodeBase64,
        ticket_url: charge.ticketUrl,
        raw: charge.raw,
      })
      .select("id")
      .single();
    if (paymentError || !payment) throw new Error("Não foi possível registrar o pagamento.");

    return {
      paymentId: payment.id as string,
      amount,
      planName: plan.name as string,
      status: charge.status,
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      ticketUrl: charge.ticketUrl,
      expiresAt: charge.expiresAt,
    };
  });

const statusSchema = z.object({ paymentId: z.string().uuid() });

/**
 * Consulta a situação do Pix e, quando aprovado, devolve a chave de ativação.
 * Serve como rede de segurança caso o webhook do Mercado Pago atrase.
 */
export const getPixCheckoutStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { settlePixPayment } = await import("@/lib/mercadopago.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, external_id, status, email")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment?.external_id) throw new Error("Pagamento não encontrado.");

    const settled = await settlePixPayment(payment.external_id);
    return { status: settled.status, licenseKey: settled.licenseKey, email: payment.email };
  });
