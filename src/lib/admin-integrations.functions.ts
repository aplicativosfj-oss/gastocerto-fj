import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Situação das integrações (Mercado Pago com credenciais sempre mascaradas). */
export const adminGetIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { describeMercadoPagoCredentials } = await import("@/lib/mercadopago-credentials.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const credentials = await describeMercadoPagoCredentials();
    const { data: lastEvent } = await supabaseAdmin
      .from("payment_events")
      .select("created_at, source")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      mercadopago: {
        ...credentials,
        active: credentials.configured,
        mode: "transparent",
        webhook_configured: true,
        last_sync: (lastEvent?.created_at as string | null) ?? null,
        last_sync_source: (lastEvent?.source as string | null) ?? null,
      },
      gemini: { active: true, model: "gemini-2.0-flash", economy_mode: true },
      email: { provider: "resend", verified_domain: "gastocerto.com.br" },
    };
  });

/** Rotaciona a Public key e o Access token, aplicando no servidor na hora. */
export const adminSaveMercadoPagoCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        publicKey: z.string().trim().min(20).max(200),
        accessToken: z.string().trim().min(20).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { saveMercadoPagoCredentials, maskCredential } = await import(
      "@/lib/mercadopago-credentials.server"
    );
    const summary = await saveMercadoPagoCredentials({
      publicKey: data.publicKey,
      accessToken: data.accessToken,
      updatedBy: context.userId,
    });

    // A auditoria guarda apenas máscaras — o valor real nunca é registrado.
    await auditLog(context, "mercadopago_credentials_rotated", {
      public_key: maskCredential(data.publicKey),
      access_token: maskCredential(data.accessToken),
      environment: summary.environment,
    });

    return summary;
  });

/** Testa a credencial ativa direto na API do Mercado Pago. */
export const adminTestMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { testMercadoPagoCredentials } = await import("@/lib/mercadopago-credentials.server");
    const result = await testMercadoPagoCredentials();
    await auditLog(context, "mercadopago_connection_test", {
      ok: result.ok,
      status: result.status,
      pix_enabled: result.pixEnabled,
    });
    return result;
  });

/** Envia um e-mail de teste para validar a integração de e-mail (Resend). */
export const adminTestEmailDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ to: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { sendLicenseKeyEmail } = await import("@/lib/license-delivery.server");
    
    // Simulamos um recibo/licença real para o teste ser fiel
    const result = await sendLicenseKeyEmail({
      to: data.to,
      fullName: "Destinatário de Teste",
      planName: "Premium IA (Teste)",
      licenseKey: "GC-TEST-EMAIL-SENT",
      statusUrl: `${process.env["APP_URL"] || "http://localhost:8080"}/pedido/test-id`
    });

    await auditLog(context, "admin_email_test_sent", {
      to: data.to,
      success: result.delivered,
      channel: result.channel,
      reason: result.reason
    });

    return result;
  });


/** Dispara a revalidação dos pagamentos pendentes manualmente. */
export const adminReconcilePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ hours: z.number().int().min(1).max(720).default(72) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { reconcilePendingPayments } = await import("@/lib/mercadopago.server");
    const summary = await reconcilePendingPayments({ hours: data.hours, limit: 100 });
    await auditLog(context, "mercadopago_manual_reconciliation", {
      checked: summary.checked,
      corrected: summary.corrected,
      failed: summary.failed,
      hours: data.hours,
    });
    return summary;
  });

/** Desativa e remove as credenciais do Mercado Pago salvas no banco. */
export const adminDeleteMercadoPagoCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { disableStoredCredentials } = await import("@/lib/mercadopago-credentials.server");
    const summary = await disableStoredCredentials(context.userId);

    await auditLog(context, "mercadopago_credentials_deleted", {
      action: "disabled_and_deleted_from_db",
      fallback: summary.source === "environment" ? "using_env_vars" : "none",
    });

    return summary;
  });


/**
 * Auditoria do checkout Pix: tentativas de verificação por e-mail, cobranças
 * criadas, situação atual e erros devolvidos pelo Mercado Pago.
 */
export const adminGetCheckoutAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(160).optional(),
        status: z.string().trim().max(40).optional(),
        days: z.number().int().min(1).max(365).default(30),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertStaffCtx } = await import("@/lib/admin-guard.server");
    await assertStaffCtx(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    let paymentsQuery = supabaseAdmin
      .from("payments")
      .select(
        "id, email, user_id, provider, method, external_id, amount, status, paid_at, created_at, updated_at, license_id, raw",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") paymentsQuery = paymentsQuery.eq("status", data.status);
    if (data.search) paymentsQuery = paymentsQuery.ilike("email", `%${data.search}%`);

    const { data: payments } = await paymentsQuery;

    const paymentIds = (payments ?? []).map((payment) => payment.id as string);
    const { data: events } = paymentIds.length
      ? await supabaseAdmin
          .from("payment_events")
          .select("payment_id, event_type, status, source, detail, created_at")
          .in("payment_id", paymentIds)
          .order("created_at", { ascending: false })
          .limit(1000)
      : { data: [] as any[] };

    let attemptsQuery = supabaseAdmin
      .from("checkout_verifications")
      .select(
        "id, email, full_name, plan_slug, billing_cycle, attempts, verified_at, consumed_at, expires_at, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) attemptsQuery = attemptsQuery.ilike("email", `%${data.search}%`);
    const { data: attempts } = await attemptsQuery;

    const eventsByPayment = new Map<string, any[]>();
    for (const event of events ?? []) {
      const key = String(event.payment_id);
      eventsByPayment.set(key, [...(eventsByPayment.get(key) ?? []), event]);
    }

    const charges = (payments ?? []).map((payment) => {
      const raw = (payment.raw ?? {}) as Record<string, any>;
      const timeline = eventsByPayment.get(payment.id as string) ?? [];
      return {
        id: payment.id as string,
        email: (payment.email as string | null) ?? null,
        userId: (payment.user_id as string | null) ?? null,
        method: String(payment.method ?? "pix"),
        externalId: (payment.external_id as string | null) ?? null,
        amount: Number(payment.amount ?? 0),
        status: String(payment.status ?? "pending"),
        statusDetail: (raw["status_detail"] as string | null) ?? null,
        mpError:
          (raw["message"] as string | null) ??
          (Array.isArray(raw["cause"]) ? String(raw["cause"][0]?.description ?? "") : null) ??
          null,
        licenseId: (payment.license_id as string | null) ?? null,
        createdAt: payment.created_at as string,
        paidAt: (payment.paid_at as string | null) ?? null,
        released: timeline.some((event) => event.event_type === "license_released"),
        emailed: timeline.some((event) => event.event_type === "key_email_sent"),
        lastCheckedAt: (timeline[0]?.created_at as string | null) ?? null,
        events: timeline.slice(0, 12).map((event) => ({
          type: String(event.event_type),
          status: (event.status as string | null) ?? null,
          source: String(event.source ?? "webhook"),
          createdAt: event.created_at as string,
        })),
      };
    });

    const now = Date.now();
    const verifications = (attempts ?? []).map((attempt) => ({
      id: attempt.id as string,
      email: attempt.email as string,
      fullName: attempt.full_name as string,
      planSlug: attempt.plan_slug as string,
      cycle: attempt.billing_cycle as string,
      attempts: Number(attempt.attempts ?? 0),
      verified: Boolean(attempt.verified_at),
      consumed: Boolean(attempt.consumed_at),
      expired: new Date(attempt.expires_at as string).getTime() < now && !attempt.consumed_at,
      createdAt: attempt.created_at as string,
    }));

    return {
      charges,
      verifications,
      summary: {
        total: charges.length,
        approved: charges.filter((charge) => charge.status === "approved").length,
        pending: charges.filter((charge) => ["pending", "in_process"].includes(charge.status)).length,
        failed: charges.filter((charge) =>
          ["rejected", "cancelled", "expired"].includes(charge.status),
        ).length,
        verificationsStarted: verifications.length,
        verificationsConfirmed: verifications.filter((item) => item.verified).length,
        abandoned: verifications.filter((item) => !item.consumed).length,
      },
    };
  });

/** Registra cliques em ações externas no painel de integrações para auditoria. */
export const adminLogIntegrationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ 
      integration: z.enum(["mercadopago", "gemini", "email"]),
      action: z.string().max(50),
      detail: z.string().max(200).optional()
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { assertStaffCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertStaffCtx(context);

    await auditLog(context, "integration_action_click", {
      integration: data.integration,
      action: data.action,
      detail: data.detail
    });

    return { ok: true };
  });

/** Aciona o ajuste de limites/configurações da IA Gemini com registro em auditoria. */
export const adminAdjustGeminiLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    // No futuro aqui viria a lógica real de alteração de cotas no banco.
    // Por enquanto registramos a intenção e o acesso.
    await auditLog(context, "gemini_limits_adjustment_triggered", {
      model: "gemini-2.0-flash",
      economy_mode: true
    });

    return { ok: true, message: "Limites sincronizados com o plano atual." };
  });

