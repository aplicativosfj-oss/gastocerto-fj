/**
 * Pedidos manuais: sem integração com provedores de pagamento. O cliente pede
 * o plano no site, o administrador confirma o recebimento no painel e a chave
 * de licença é liberada e enviada uma única vez.
 *
 * Este arquivo nunca deve ser importado por código de interface.
 */

/** URL pública onde o cliente acompanha o pedido e recupera a chave. */
const STATUS_BASE_URL = "https://gastocerto-fj.lovable.app/pedido";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Registra um evento do pedido (histórico auditável e à prova de reenvios). */
export async function logPaymentEvent(input: {
  paymentId: string;
  licenseId?: string | null;
  externalId?: string | null;
  eventType: string;
  status?: string | null;
  source: string;
  detail?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("payment_events").insert({
    payment_id: input.paymentId,
    license_id: input.licenseId ?? null,
    external_id: input.externalId ?? null,
    event_type: input.eventType,
    status: input.status ?? null,
    source: input.source,
    detail: (input.detail ?? {}) as never,
  });
  // O índice único de "license_released" faz a duplicidade falhar de propósito.
  if (error && !error.message.includes("payment_events_license_release_once")) {
    console.error("[pedidos] não foi possível registrar o evento", error.message);
  }
  return { inserted: !error };
}

export type ManualSettleResult = {
  status: string;
  licenseKey: string | null;
  delivered: boolean;
};

/**
 * Confirma (approved) ou recusa (cancelled) um pedido manualmente. Quando
 * aprovado, ativa a licença e envia a chave por e-mail uma única vez — a
 * proteção é o índice único de `license_released`.
 */
export async function settleManualPayment(
  paymentId: string,
  options: { status: "approved" | "cancelled"; source?: string; note?: string | null },
): Promise<ManualSettleResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const source = options.source ?? "admin_manual";
  const status = options.status;

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, license_id, status, email, amount")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) throw new Error("Pedido não encontrado.");

  const paidAt = status === "approved" ? new Date().toISOString() : null;
  if (payment.status !== status) {
    await supabaseAdmin
      .from("payments")
      .update({ status, paid_at: paidAt })
      .eq("id", payment.id);
    await logPaymentEvent({
      paymentId: payment.id,
      licenseId: payment.license_id,
      eventType: "status_change",
      status,
      source,
      detail: {
        from: payment.status,
        to: status,
        amount: Number(payment.amount ?? 0),
        note: options.note ?? null,
      },
    });
  } else {
    await logPaymentEvent({
      paymentId: payment.id,
      licenseId: payment.license_id,
      eventType: "status_check",
      status,
      source,
    });
  }

  const { data: license } = await supabaseAdmin
    .from("licenses")
    .select(
      "id, license_key, status, billing_cycle, plan_id, email, full_name, user_id, activated_at, plans(name)",
    )
    .eq("id", payment.license_id ?? "")
    .maybeSingle();
  if (!license) return { status, licenseKey: null, delivered: false };

  let delivered = false;

  if (status === "approved") {
    const release = await logPaymentEvent({
      paymentId: payment.id,
      licenseId: license.id,
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
          notes: "Pagamento confirmado manualmente pelo administrador",
        })
        .eq("id", license.id);

      if (license.user_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ plan_id: license.plan_id, status: "active" })
          .eq("user_id", license.user_id);
      }

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
        eventType: outcome.delivered ? "key_email_sent" : "key_email_fallback",
        status,
        source,
        detail: { channel: outcome.channel, reason: outcome.reason ?? null },
      });
    } else {
      delivered = true;
    }
  }

  if (status === "cancelled" && license.status === "pending") {
    await supabaseAdmin.from("licenses").update({ status: "revoked" }).eq("id", license.id);
  }

  return {
    status,
    licenseKey: status === "approved" ? (license.license_key as string) : null,
    delivered,
  };
}

/** Reenvia a chave já liberada de um pedido aprovado. */
export async function resendManualLicense(paymentId: string, source = "resend_request") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, license_id, status, email")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) throw new Error("Pedido não encontrado.");
  if (String(payment.status) !== "approved") {
    throw new Error("Confirme o pagamento antes de enviar a chave.");
  }

  const { data: license } = await supabaseAdmin
    .from("licenses")
    .select("id, license_key, email, full_name, plans(name)")
    .eq("id", payment.license_id ?? "")
    .maybeSingle();
  if (!license) throw new Error("Licença não encontrada para este pedido.");

  const { sendLicenseKeyEmail } = await import("@/lib/license-delivery.server");
  const outcome = await sendLicenseKeyEmail({
    to: (license.email as string) ?? (payment.email as string) ?? "",
    fullName: (license.full_name as string | null) ?? null,
    planName: (license as any).plans?.name ?? "GastoCerto",
    licenseKey: license.license_key as string,
    statusUrl: `${STATUS_BASE_URL}/${payment.id}`,
  });

  await logPaymentEvent({
    paymentId: payment.id,
    licenseId: license.id,
    eventType: outcome.delivered ? "key_email_sent" : "key_email_fallback",
    status: "approved",
    source,
    detail: { channel: outcome.channel, reason: outcome.reason ?? null, resend: true },
  });

  return {
    delivered: outcome.delivered,
    status: "approved",
    licenseKey: license.license_key as string,
  };
}
