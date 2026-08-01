/**
 * Entrega da chave de ativação após o pagamento aprovado.
 * Este arquivo é somente de servidor e nunca deve ser importado pela interface.
 *
 * O envio por e-mail é tentado imediatamente após a confirmação do Pix. Quando
 * a infraestrutura de e-mail ainda não está disponível (domínio remetente não
 * configurado) ou o envio falha, registramos o motivo e a chave continua
 * disponível na tela de acompanhamento do pedido — o cliente nunca fica sem
 * acesso ao código.
 */
export type DeliveryOutcome = {
  delivered: boolean;
  channel: "email" | "onscreen";
  reason?: string;
};

function senderDomain() {
  return process.env["SENDER_DOMAIN"] ?? process.env["LOVABLE_EMAIL_SENDER_DOMAIN"] ?? null;
}

/** Envia a chave por e-mail quando possível; devolve o motivo do fallback. */
export async function sendLicenseKeyEmail(input: {
  to: string;
  fullName: string | null;
  planName: string;
  licenseKey: string;
  statusUrl: string;
}): Promise<DeliveryOutcome> {
  const domain = senderDomain();
  if (!domain) {
    return {
      delivered: false,
      channel: "onscreen",
      reason: "email_domain_not_configured",
    };
  }

  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail("license-key", input.to, {
      templateData: {
        fullName: input.fullName,
        planName: input.planName,
        licenseKey: input.licenseKey,
        statusUrl: input.statusUrl,
      },
      idempotencyKey: `license-key-${input.licenseKey}`,
    });
    if (!result?.sent) {
      return { delivered: false, channel: "onscreen", reason: result?.reason ?? "not_sent" };
    }
    return { delivered: true, channel: "email" };
  } catch (error) {
    console.error("[checkout] falha ao enviar a chave por e-mail", error);
    return {
      delivered: false,
      channel: "onscreen",
      reason: error instanceof Error ? error.message : "email_error",
    };
  }
}
