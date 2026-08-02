import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin-guard";
import { auditLog } from "./admin-guard.server";

export const EMAIL_ROLLOUT_KEY = "email_rollout";

export type EmailRollout = {
  /** Domínio de envio informado pelo administrador (ex.: notify.meusite.com). */
  senderDomain: string | null;
  /** Marcado quando o administrador confirma que o domínio foi verificado. */
  domainReady: boolean;
  /** E-mail usado no último teste. */
  testEmail: string | null;
  /** Data/hora do último teste bem-sucedido. */
  testSentAt: string | null;
  /** Libera o envio de e-mails para todos os clientes. */
  enabledForAll: boolean;
  note: string | null;
  updatedAt: string | null;
};

const RolloutSchema = z.object({
  senderDomain: z.string().trim().max(180).nullable().default(null),
  domainReady: z.boolean().default(false),
  testEmail: z.string().trim().max(180).nullable().default(null),
  testSentAt: z.string().nullable().default(null),
  enabledForAll: z.boolean().default(false),
  note: z.string().trim().max(500).nullable().default(null),
});

function normalize(value: unknown): EmailRollout {
  const parsed = RolloutSchema.safeParse(value ?? {});
  const base = parsed.success ? parsed.data : RolloutSchema.parse({});
  return { ...base, updatedAt: null };
}

/** Estado atual do assistente de configuração de e-mail. */
export const getEmailRollout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { data } = await supabase
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", EMAIL_ROLLOUT_KEY)
      .maybeSingle();

    const state = normalize(data?.value);
    return { ...state, updatedAt: data?.updated_at ?? null } satisfies EmailRollout;
  });

/** Salva o progresso do assistente (etapas concluídas e liberação geral). */
export const saveEmailRollout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RolloutSchema.partial().parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { data: current } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", EMAIL_ROLLOUT_KEY)
      .maybeSingle();

    const merged = normalize({ ...(current?.value as object | null), ...data });
    const { updatedAt: _ignored, ...value } = merged;

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: EMAIL_ROLLOUT_KEY,
        value,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error("Não foi possível salvar a configuração de e-mail");

    await auditLog(context, "update_email_rollout", {
      domain_ready: value.domainReady,
      enabled_for_all: value.enabledForAll,
      sender_domain: value.senderDomain,
    });

    return merged;
  });

/**
 * Teste de envio. Enquanto o domínio de envio não estiver verificado, o teste é
 * feito pelo canal interno (aviso na central de notificações do administrador),
 * assim é possível validar todo o fluxo de alertas antes de liberar o e-mail.
 */
export const sendEmailRolloutTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) =>
    z.object({ email: z.string().trim().email().max(180) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const now = new Date();
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      notification_type: "kids",
      title: "Teste de aviso do Espaço Kids",
      message:
        `Este é um teste do canal de avisos. Destino informado: ${data.email}. ` +
        "Se você recebeu este aviso no app, os alertas do Espaço Kids estão funcionando.",
      severity: "info",
      link: "/kids-auditoria",
      dedupe_key: `email-test:${now.toISOString().slice(0, 16)}`,
    });
    if (error) throw new Error("Não foi possível registrar o teste de aviso");

    const { data: current } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", EMAIL_ROLLOUT_KEY)
      .maybeSingle();

    const merged = normalize({
      ...(current?.value as object | null),
      testEmail: data.email,
      testSentAt: now.toISOString(),
    });
    const { updatedAt: _ignored, ...value } = merged;

    await supabase.from("app_settings").upsert(
      { key: EMAIL_ROLLOUT_KEY, value, updated_at: now.toISOString(), updated_by: userId },
      { onConflict: "key" },
    );

    await auditLog(context, "email_rollout_test", { email: data.email });

    return { ok: true, channel: "in_app" as const, sentAt: now.toISOString() };
  });
