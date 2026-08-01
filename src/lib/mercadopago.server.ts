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

/**
 * Reconcilia um pagamento: confirma no Mercado Pago, grava a situação e,
 * quando aprovado, libera a chave de licença do cliente.
 */
export async function settlePixPayment(externalId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mp = await fetchMpPayment(externalId);
  const status = String(mp["status"] ?? "pending");

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, license_id, status, email, amount")
    .eq("external_id", externalId)
    .maybeSingle();
  if (!payment) return { status, licenseKey: null as string | null };

  const paidAt = status === "approved" ? (mp["date_approved"] ?? new Date().toISOString()) : null;
  if (payment.status !== status) {
    await supabaseAdmin
      .from("payments")
      .update({ status, paid_at: paidAt, raw: mp })
      .eq("id", payment.id);
  }

  const { data: license } = await supabaseAdmin
    .from("licenses")
    .select("id, license_key, status, billing_cycle, plan_id, email, user_id, activated_at")
    .eq("id", payment.license_id ?? "")
    .maybeSingle();
  if (!license) return { status, licenseKey: null };

  if (status === "approved" && license.status === "pending") {
    // Pago: a chave passa a valer e o cliente pode ativá-la na conta.
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
  }

  if (["cancelled", "rejected", "expired"].includes(status) && license.status === "pending") {
    await supabaseAdmin.from("licenses").update({ status: "revoked" }).eq("id", license.id);
  }

  return {
    status,
    licenseKey: status === "approved" ? (license.license_key as string) : null,
  };
}
