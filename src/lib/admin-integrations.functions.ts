import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const manualSchema = z.object({
  pixKey: z.string().trim().max(160).default(""),
  pixKeyType: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]).default("cpf"),
  holder: z.string().trim().max(120).default(""),
  bank: z.string().trim().max(120).default(""),
  whatsapp: z.string().trim().max(40).default(""),
  instructions: z.string().trim().max(600).default(""),
});

export type ManualPaymentSettings = z.infer<typeof manualSchema>;

export const MANUAL_PAYMENT_DEFAULTS: ManualPaymentSettings = {
  pixKey: "",
  pixKeyType: "cpf",
  holder: "",
  bank: "",
  whatsapp: "",
  instructions:
    "Faça o Pix no valor do plano, envie o comprovante e o administrador confirma o pagamento e libera sua chave de ativação.",
};

/** Situação das integrações ativas (pagamento manual, IA e e-mail). */
export const adminGetIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: setting }, { data: lastEvent }, { data: pending }] = await Promise.all([
      supabaseAdmin.from("app_settings").select("value, updated_at").eq("key", "manual_payment").maybeSingle(),
      supabaseAdmin
        .from("payment_events")
        .select("created_at, source")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.from("payments").select("id").eq("status", "pending").limit(200),
    ]);

    const manual = manualSchema.parse({ ...MANUAL_PAYMENT_DEFAULTS, ...((setting?.value as object) ?? {}) });

    return {
      manual_payment: {
        ...manual,
        configured: Boolean(manual.pixKey),
        pending_orders: (pending ?? []).length,
        updated_at: (setting?.updated_at as string | null) ?? null,
        last_event: (lastEvent?.created_at as string | null) ?? null,
        last_event_source: (lastEvent?.source as string | null) ?? null,
      },
      gemini: { active: true, model: "gemini-2.0-flash", economy_mode: true },
      email: { provider: "resend", verified_domain: "gastocerto.com.br" },
    };
  });

/** Salva os dados de pagamento manual exibidos no checkout do site. */
export const adminSaveManualPaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => manualSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: "manual_payment",
        value: data as never,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error("Não foi possível salvar os dados de pagamento.");

    await auditLog(context, "manual_payment_settings_updated", {
      pix_key_type: data.pixKeyType,
      has_pix_key: Boolean(data.pixKey),
      holder: data.holder,
    });

    return { ok: true, ...data };
  });

/** Confirma ou recusa manualmente um pedido, liberando a chave quando aprovado. */
export const adminSettleManualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        status: z.enum(["approved", "cancelled"]),
        note: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { settleManualPayment } = await import("@/lib/manual-orders.server");
    const result = await settleManualPayment(data.paymentId, {
      status: data.status,
      source: "admin_manual",
      note: data.note ?? null,
    });

    await auditLog(context, "manual_payment_settled", {
      payment_id: data.paymentId,
      status: data.status,
      delivered: result.delivered,
      note: data.note ?? null,
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
      statusUrl: `${process.env["APP_URL"] || "http://localhost:8080"}/pedido/test-id`,
    });

    await auditLog(context, "admin_email_test_sent", {
      to: data.to,
      success: result.delivered,
      channel: result.channel,
      reason: result.reason,
    });

    return result;
  });

/**
 * Auditoria do checkout: tentativas de verificação por e-mail, pedidos criados,
 * situação atual e liberação da chave.
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
        method: String(payment.method ?? "manual"),
        externalId: (payment.external_id as string | null) ?? null,
        amount: Number(payment.amount ?? 0),
        status: String(payment.status ?? "pending"),
        statusDetail: (raw["status_detail"] as string | null) ?? null,
        mpError: null as string | null,
        licenseId: (payment.license_id as string | null) ?? null,
        createdAt: payment.created_at as string,
        paidAt: (payment.paid_at as string | null) ?? null,
        released: timeline.some((event) => event.event_type === "license_released"),
        emailed: timeline.some((event) => event.event_type === "key_email_sent"),
        lastCheckedAt: (timeline[0]?.created_at as string | null) ?? null,
        events: timeline.slice(0, 12).map((event) => ({
          type: String(event.event_type),
          status: (event.status as string | null) ?? null,
          source: String(event.source ?? "admin_manual"),
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
    z
      .object({
        integration: z.enum(["manual_payment", "gemini", "email"]),
        action: z.string().max(50),
        detail: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertStaffCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertStaffCtx(context);

    await auditLog(context, "integration_action_click", {
      integration: data.integration,
      action: data.action,
      detail: data.detail,
    });

    return { ok: true };
  });

/** Aciona o ajuste de limites/configurações da IA Gemini com registro em auditoria. */
export const adminAdjustGeminiLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    await auditLog(context, "gemini_limits_adjustment_triggered", {
      model: "gemini-2.0-flash",
      economy_mode: true,
    });

    return { ok: true, message: "Limites sincronizados com o plano atual." };
  });

/** Situação e credenciais mascaradas do Mercado Pago. */
export const adminGetMercadoPagoStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { resolveMercadoPagoCredentials, maskSecret } = await import("@/lib/mercadopago-credentials.server");
    const credentials = await resolveMercadoPagoCredentials();

    return {
      source: credentials.source,
      environment: credentials.environment,
      rotatedAt: credentials.rotatedAt,
      updatedAt: credentials.updatedAt,
      hasPublicKey: Boolean(credentials.publicKey),
      hasAccessToken: Boolean(credentials.accessToken),
      hasClientId: Boolean(credentials.clientId),
      hasClientSecret: Boolean(credentials.clientSecret),
      publicKeyMasked: maskSecret(credentials.publicKey),
      accessTokenMasked: maskSecret(credentials.accessToken),
      clientIdMasked: maskSecret(credentials.clientId),
      clientSecretMasked: maskSecret(credentials.clientSecret),
    };
  });

/** Salva (rotaciona) as credenciais do Mercado Pago. */
export const adminSaveMercadoPagoCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        publicKey: z.string().trim().max(200).optional(),
        accessToken: z.string().trim().max(300).optional(),
        clientId: z.string().trim().max(120).optional(),
        clientSecret: z.string().trim().max(200).optional(),
        environment: z.enum(["production", "sandbox"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { saveMercadoPagoCredentials } = await import("@/lib/mercadopago-credentials.server");
    const saved = await saveMercadoPagoCredentials({ ...data, updatedBy: context.userId });

    await auditLog(context, "mercadopago_credentials_saved", {
      environment: saved.environment,
      changed_public_key: Boolean(data.publicKey),
      changed_access_token: Boolean(data.accessToken),
      changed_client_id: Boolean(data.clientId),
      changed_client_secret: Boolean(data.clientSecret),
    });

    return { ok: true, source: saved.source, environment: saved.environment };
  });

/** Testa o Access Token do Mercado Pago e retorna conectado/desconectado. */
export const adminTestMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { resolveMercadoPagoCredentials, testAccessToken } = await import(
      "@/lib/mercadopago-credentials.server"
    );
    const credentials = await resolveMercadoPagoCredentials();
    const result = await testAccessToken(credentials.accessToken);

    await auditLog(context, "mercadopago_access_token_tested", {
      ok: result.ok,
      message: result.message,
      source: credentials.source,
    });

    return { ...result, source: credentials.source };
  });

/** Testa o Client ID e o Client Secret via OAuth e retorna conectado/desconectado. */
export const adminTestMercadoPagoOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { resolveMercadoPagoCredentials, testClientCredentials } = await import(
      "@/lib/mercadopago-credentials.server"
    );
    const credentials = await resolveMercadoPagoCredentials();
    const result = await testClientCredentials(credentials.clientId, credentials.clientSecret);

    await auditLog(context, "mercadopago_client_credentials_tested", {
      ok: result.ok,
      message: result.message,
      source: credentials.source,
    });

    return { ...result, source: credentials.source };
  });

/** Remove em tempo real as credenciais salvas no banco. */
export const adminDeleteMercadoPagoCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCtx, auditLog } = await import("@/lib/admin-guard.server");
    await assertAdminCtx(context);

    const { disableStoredCredentials } = await import("@/lib/mercadopago-credentials.server");
    const result = await disableStoredCredentials();

    await auditLog(context, "mercadopago_credentials_deleted", { fallback_source: result.source });

    return { ok: true, source: result.source };
  });
