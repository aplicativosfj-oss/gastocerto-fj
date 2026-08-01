/**
 * Integração servidor-a-servidor com o Mercado Pago (checkout transparente Pix).
 * Este arquivo nunca deve ser importado por código de interface.
 */
const MP_API = "https://api.mercadopago.com";

/** URL pública estável usada pelo Mercado Pago para notificar pagamentos. */
const WEBHOOK_URL = "https://gastocerto-fj.lovable.app/api/public/mercadopago/webhook";

function token() {
  const value = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!value) throw new Error("Pagamento indisponível: credencial do Mercado Pago ausente.");
  return value;
}

async function mpFetch(path: string, init?: RequestInit & { idempotencyKey?: string }) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token()}`);
  headers.set("Content-Type", "application/json");
  if (init?.idempotencyKey) headers.set("X-Idempotency-Key", init.idempotencyKey);

  const response = await fetch(`${MP_API}${path}`, { ...init, headers });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[mercadopago] ${path} falhou [${response.status}]: ${body}`);
    throw new Error(`Mercado Pago recusou a solicitação [${response.status}]: ${body}`);
  }
  return body ? (JSON.parse(body) as Record<string, any>) : {};
}

export type PixCharge = {
  externalId: string;
  status: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  raw: Record<string, any>;
};

/** Cria uma cobrança Pix e devolve o QR Code para exibição no checkout. */
export async function createPixCharge(input: {
  amount: number;
  description: string;
  email: string;
  fullName: string;
  cpf: string;
  externalReference: string;
}): Promise<PixCharge> {
  const [firstName, ...rest] = input.fullName.trim().split(/\s+/);
  const payment = await mpFetch("/v1/payments", {
    method: "POST",
    idempotencyKey: input.externalReference,
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalReference,
      notification_url: WEBHOOK_URL,
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      payer: {
        email: input.email,
        first_name: firstName || "Cliente",
        last_name: rest.join(" ") || "GastoCerto",
        identification: { type: "CPF", number: input.cpf.replace(/\D/g, "") },
      },
    }),
  });

  const data = payment["point_of_interaction"]?.transaction_data ?? {};
  return {
    externalId: String(payment["id"]),
    status: String(payment["status"] ?? "pending"),
    qrCode: data.qr_code ?? null,
    qrCodeBase64: data.qr_code_base64 ?? null,
    ticketUrl: data.ticket_url ?? null,
    expiresAt: payment["date_of_expiration"] ?? null,
    raw: payment,
  };
}

/** Consulta o pagamento diretamente no Mercado Pago. */
export async function fetchMpPayment(externalId: string) {
  return mpFetch(`/v1/payments/${externalId}`);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** URL pública onde o cliente acompanha o pedido e recupera a chave. */
const STATUS_BASE_URL = "https://gastocerto-fj.lovable.app/pedido";

/** Registra um evento do pedido (histórico auditável e à prova de reenvios). */
async function logPaymentEvent(input: {
  paymentId: string;
  licenseId?: string | null;
  externalId: string;
  eventType: string;
  status?: string | null;
  source: string;
  detail?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("payment_events").insert({
    payment_id: input.paymentId,
    license_id: input.licenseId ?? null,
    external_id: input.externalId,
    event_type: input.eventType,
    status: input.status ?? null,
    source: input.source,
    detail: (input.detail ?? {}) as never,
  });
  // O índice único de "license_released" faz a duplicidade falhar de propósito.
  if (error && !error.message.includes("payment_events_license_release_once")) {
    console.error("[mercadopago] não foi possível registrar o evento", error.message);
  }
  return { inserted: !error };
}

/**
 * Reconcilia um pagamento: confirma no Mercado Pago, grava a situação e,
 * quando aprovado, libera a chave de licença do cliente uma única vez.
 *
 * A liberação é protegida por um índice único (`license_released`): reenvios do
 * webhook e consultas manuais reprocessam a situação sem gerar chave duplicada,
 * segunda ativação de plano ou segundo e-mail.
 */
export async function settlePixPayment(externalId: string, source = "webhook") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mp = await fetchMpPayment(externalId);
  const status = String(mp["status"] ?? "pending");

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, license_id, status, email, amount")
    .eq("external_id", externalId)
    .maybeSingle();
  if (!payment) {
    console.warn(`[mercadopago] pagamento ${externalId} não encontrado no banco`);
    return { status, licenseKey: null as string | null, delivered: false };
  }

  const paidAt = status === "approved" ? (mp["date_approved"] ?? new Date().toISOString()) : null;
  if (payment.status !== status) {
    await supabaseAdmin
      .from("payments")
      .update({ status, paid_at: paidAt, raw: mp })
      .eq("id", payment.id);
    await logPaymentEvent({
      paymentId: payment.id,
      licenseId: payment.license_id,
      externalId,
      eventType: "status_change",
      status,
      source,
      detail: { from: payment.status, to: status, amount: Number(payment.amount ?? 0) },
    });
  } else {
    await logPaymentEvent({
      paymentId: payment.id,
      licenseId: payment.license_id,
      externalId,
      eventType: "status_check",
      status,
      source,
    });
  }

  const { data: license } = await supabaseAdmin
    .from("licenses")
    .select("id, license_key, status, billing_cycle, plan_id, email, full_name, user_id, activated_at, plans(name)")
    .eq("id", payment.license_id ?? "")
    .maybeSingle();
  if (!license) return { status, licenseKey: null, delivered: false };

  let delivered = false;

  if (status === "approved") {
    // Reserva a liberação: se outro reenvio já liberou, o insert falha e saímos.
    const release = await logPaymentEvent({
      paymentId: payment.id,
      licenseId: license.id,
      externalId,
      eventType: "license_released",
      status,
      source,
      detail: { license_key: license.license_key },
    });

    if (release.inserted) {
      const now = new Date();
      const months = license.billing_cycle === "annual" ? 12 : 1;
      await supabaseAdmin
        .from("licenses")
        .update({
          status: license.user_id ? "active" : "pending",
          activated_at: license.user_id ? now.toISOString() : null,
          expires_at: license.user_id ? addMonths(now, months).toISOString() : null,
          notes: "Pagamento Pix confirmado pelo Mercado Pago",
        })
        .eq("id", license.id);

      if (license.user_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ plan_id: license.plan_id, status: "active" })
          .eq("user_id", license.user_id);
      }

      // Envio imediato da chave, com fallback registrado quando indisponível.
      const { sendLicenseKeyEmail } = await import("@/lib/license-delivery.server");
      const outcome = await sendLicenseKeyEmail({
        to: (license.email as string) ?? (payment.email as string) ?? "",
        fullName: (license.full_name as string | null) ?? null,
        planName: (license as any).plans?.name ?? "GastoCerto",
        licenseKey: license.license_key as string,
        statusUrl: `${STATUS_BASE_URL}/${payment.id}`,
      });
      delivered = outcome.delivered;
      await logPaymentEvent({
        paymentId: payment.id,
        licenseId: license.id,
        externalId,
        eventType: outcome.delivered ? "key_email_sent" : "key_email_fallback",
        status,
        source,
        detail: { channel: outcome.channel, reason: outcome.reason ?? null },
      });
      console.log(
        `[mercadopago] chave liberada para ${externalId} (envio: ${outcome.delivered ? "e-mail" : `fallback/${outcome.reason}`})`,
      );
    } else {
      console.log(`[mercadopago] reenvio ignorado: chave de ${externalId} já liberada`);
      delivered = true;
    }
  }

  if (["cancelled", "rejected", "expired"].includes(status) && license.status === "pending") {
    await supabaseAdmin.from("licenses").update({ status: "revoked" }).eq("id", license.id);
  }

  return {
    status,
    licenseKey: status === "approved" ? (license.license_key as string) : null,
    delivered,
  };
}

