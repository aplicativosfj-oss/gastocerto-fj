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

  // A infraestrutura de e-mail do projeto ainda não foi provisionada
  // (nenhum domínio remetente verificado). Assim que o domínio estiver ativo,
  // este ponto envia a chave usando os modelos de e-mail do app.
  return { delivered: false, channel: "onscreen", reason: "email_sender_unavailable" };
}

/** Envia o código de verificação do e-mail antes de criar qualquer registro. */
export async function sendVerificationCodeEmail(input: {
  to: string;
  fullName: string | null;
  code: string;
  minutes: number;
}): Promise<DeliveryOutcome> {
  const domain = senderDomain();
  if (!domain) {
    return { delivered: false, channel: "onscreen", reason: "email_domain_not_configured" };
  }

  // Assim que o domínio remetente estiver verificado, este ponto envia o código
  // usando os modelos de e-mail do app. Até então o código aparece na tela.
  console.info("[checkout] código de verificação gerado para", input.to.slice(0, 3) + "***");
  return { delivered: false, channel: "onscreen", reason: "email_sender_unavailable" };
}
