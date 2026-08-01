import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { isValidCpf, onlyDigits } from "@/lib/cpf";

const startSchema = z.object({
  planSlug: z.enum(["premium", "premium_ia"]),
  cycle: z.enum(["monthly", "annual"]),
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  cpf: z.string().trim().min(11).max(14),
  verificationId: z.string().uuid(),
});

const verifySchema = z.object({
  planSlug: z.enum(["free", "premium", "premium_ia"]),
  cycle: z.enum(["monthly", "annual"]),
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email({ message: "Informe um e-mail válido" }).max(160),
  cpf: z.string().trim().min(11).max(14),
});

/**
 * Etapa 1 do cadastro: valida os dados e envia um código de 6 dígitos para o
 * e-mail informado. Nada é registrado como cliente, licença ou pagamento aqui.
 */
export const requestCheckoutVerification = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const cpf = onlyDigits(data.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido. Confira os 11 dígitos.");

    const { createEmailVerification } = await import("@/lib/checkout-verification.server");
    return createEmailVerification({
      planSlug: data.planSlug,
      cycle: data.cycle,
      fullName: data.fullName,
      email: data.email,
      cpf,
    });
  });

/** Etapa 2: confirma o código recebido por e-mail. */
export const confirmCheckoutVerification = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ verificationId: z.string().uuid(), code: z.string().trim().length(6) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { confirmEmailVerification } = await import("@/lib/checkout-verification.server");
    return confirmEmailVerification(data.verificationId, data.code);
  });

/**
 * Etapa 3: com o e-mail confirmado, registramos o pedido como pagamento manual
 * pendente. Nenhuma cobrança automática é criada — o administrador confere o
 * recebimento no painel e libera a chave, que só então é gerada/enviada.
 */
export const startManualOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data }) => {
    const cpf = onlyDigits(data.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido. Confira os 11 dígitos.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireVerifiedCheckout, consumeVerification } = await import(
      "@/lib/checkout-verification.server"
    );

    const email = data.email.toLowerCase();
    await requireVerifiedCheckout({ verificationId: data.verificationId, email, cpf });

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, name, slug, monthly_price, annual_price, active")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (!plan || !plan.active) throw new Error("Plano indisponível no momento.");

    // O valor cobrado vem sempre do banco, nunca do navegador.
    const amount = Number(data.cycle === "annual" ? plan.annual_price : plan.monthly_price);
    if (!(amount > 0)) throw new Error("Plano sem preço configurado. Fale com o suporte.");

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
        source: "manual_request",
        status: "pending",
        user_id: profile?.user_id ?? null,
        notes: "E-mail verificado — aguardando confirmação manual do pagamento",
      })
      .select("id, license_key")
      .single();
    if (licenseError || !license) throw new Error("Não foi possível registrar o pedido.");

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        license_id: license.id,
        user_id: profile?.user_id ?? null,
        email,
        provider: "manual",
        method: "manual",
        amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (paymentError || !payment) {
      await supabaseAdmin.from("licenses").delete().eq("id", license.id);
      throw new Error("Não foi possível registrar o pedido.");
    }

    const { logPaymentEvent } = await import("@/lib/manual-orders.server");
    await logPaymentEvent({
      paymentId: payment.id as string,
      licenseId: license.id as string,
      eventType: "status_change",
      status: "pending",
      source: "site_checkout",
      detail: { amount, plan: plan.slug, cycle: data.cycle },
    });

    await consumeVerification(data.verificationId);

    return {
      paymentId: payment.id as string,
      amount,
      planName: plan.name as string,
      status: "pending" as const,
    };
  });

/**
 * Reenvia a chave de licença por e-mail (ou devolve os dados para exibição na
 * tela). Chamada pelo administrador ou pelo próprio cliente na tela do pedido.
 */
export const resendLicenseDelivery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { resendManualLicense } = await import("@/lib/manual-orders.server");
    const result = await resendManualLicense(data.paymentId);
    return { success: true, delivered: result.delivered, status: result.status };
  });

const statusSchema = z.object({ paymentId: z.string().uuid() });

/**
 * Consulta a situação do pedido e, quando confirmado pelo administrador,
 * devolve a chave de ativação.
 */
export const getCheckoutStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, status, email, license_id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Pagamento não encontrado.");

    const approved = String(payment.status) === "approved";
    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("license_key")
      .eq("id", payment.license_id ?? "")
      .maybeSingle();

    const { data: events } = await supabaseAdmin
      .from("payment_events")
      .select("event_type")
      .eq("payment_id", payment.id);

    return {
      status: String(payment.status),
      licenseKey: approved ? ((license?.license_key as string) ?? null) : null,
      delivered: (events ?? []).some((event) => event.event_type === "key_email_sent"),
      email: payment.email,
    };
  });

function maskEmail(email: string | null) {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain || !user) return null;
  const head = user.slice(0, 2);
  return `${head}${"*".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

const TIMELINE_LABEL: Record<string, string> = {
  status_change: "Situação atualizada",
  status_check: "Conferência do pedido",
  license_released: "Chave de ativação gerada",
  key_email_sent: "Chave enviada por e-mail",
  key_email_fallback: "Chave disponível nesta página",
};

/**
 * Página pública de acompanhamento do pedido: mostra pendente, pago e entregue.
 * O identificador do pedido é um UUID não sequencial, funcionando como link
 * privado do cliente.
 */
export const getOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, status, email, amount, method, created_at, paid_at, license_id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Pedido não encontrado. Confira o link recebido.");

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("license_key, status, billing_cycle, expires_at, plans(name)")
      .eq("id", payment.license_id ?? "")
      .maybeSingle();

    const { data: events } = await supabaseAdmin
      .from("payment_events")
      .select("event_type, status, created_at, detail")
      .eq("payment_id", payment.id)
      .order("created_at", { ascending: true });

    const status = String(payment.status);
    const approved = status === "approved";
    const emailed = (events ?? []).some((event) => event.event_type === "key_email_sent");

    return {
      paymentId: payment.id as string,
      status,
      approved,
      amount: Number(payment.amount ?? 0),
      method: String(payment.method ?? "manual"),
      planName: (license as any)?.plans?.name ?? "GastoCerto",
      cycle: (license?.billing_cycle as string) ?? "monthly",
      emailMasked: maskEmail(payment.email as string | null),
      createdAt: payment.created_at as string,
      paidAt: payment.paid_at as string | null,
      licenseKey: approved ? ((license?.license_key as string) ?? null) : null,
      deliveredByEmail: emailed,
      expiresAt: (license?.expires_at as string | null) ?? null,
      qrCode: null as string | null,
      qrCodeBase64: null as string | null,
      ticketUrl: null as string | null,
      timeline: (events ?? []).map((event) => ({
        label: TIMELINE_LABEL[event.event_type] ?? event.event_type,
        status: event.status,
        at: event.created_at as string,
      })),
    };
  });

/**
 * Dados públicos de pagamento manual exibidos no checkout (chave Pix, titular e
 * instruções). Configurados pelo administrador no painel de integrações.
 */
export const getManualPaymentInstructions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "manual_payment")
    .maybeSingle();

  const value = (data?.value ?? {}) as Record<string, unknown>;
  return {
    pixKey: String(value["pixKey"] ?? ""),
    pixKeyType: String(value["pixKeyType"] ?? "cpf"),
    holder: String(value["holder"] ?? ""),
    bank: String(value["bank"] ?? ""),
    whatsapp: String(value["whatsapp"] ?? ""),
    instructions: String(
      value["instructions"] ??
        "Faça o Pix no valor do plano, envie o comprovante e o administrador confirma o pagamento e libera sua chave de ativação.",
    ),
  };
});
