import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MercadoPagoCredentials = {
  publicKey: string;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  source: "database" | "environment" | "none";
  environment: string;
  rotatedAt: string | null;
  updatedAt: string | null;
};

const MP_API = "https://api.mercadopago.com";

/** Máscara segura para exibir credenciais no painel sem revelar o valor completo. */
export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  const clean = String(value);
  if (clean.length <= 10) return `${clean.slice(0, 2)}••••`;
  return `${clean.slice(0, 8)}••••${clean.slice(-4)}`;
}

/** Resolve as credenciais ativas: banco de dados primeiro, senão variáveis de ambiente. */
export async function resolveMercadoPagoCredentials(): Promise<MercadoPagoCredentials> {
  const { data } = await supabaseAdmin
    .from("integration_credentials")
    .select("public_key, access_token, client_id, client_secret, environment, rotated_at, updated_at, active")
    .eq("provider", "mercadopago")
    .eq("active", true)
    .maybeSingle();

  if (data?.access_token || data?.client_id) {
    return {
      publicKey: data.public_key ?? "",
      accessToken: data.access_token ?? "",
      clientId: data.client_id ?? "",
      clientSecret: data.client_secret ?? "",
      source: "database",
      environment: data.environment ?? "production",
      rotatedAt: data.rotated_at ?? null,
      updatedAt: data.updated_at ?? null,
    };
  }

  const envToken = process.env["MERCADOPAGO_ACCESS_TOKEN"] ?? "";
  const envPublic = process.env["MERCADOPAGO_PUBLIC_KEY"] ?? "";
  return {
    publicKey: envPublic,
    accessToken: envToken,
    clientId: process.env["MERCADOPAGO_CLIENT_ID"] ?? "",
    clientSecret: process.env["MERCADOPAGO_CLIENT_SECRET"] ?? "",
    source: envToken || envPublic ? "environment" : "none",
    environment: envToken.startsWith("TEST-") ? "sandbox" : "production",
    rotatedAt: null,
    updatedAt: null,
  };
}

/** Grava/rotaciona as credenciais no banco (têm prioridade sobre o ambiente). */
export async function saveMercadoPagoCredentials(input: {
  publicKey?: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  environment?: string;
  updatedBy?: string | null;
}) {
  const current = await resolveMercadoPagoCredentials();
  const now = new Date().toISOString();

  const payload = {
    provider: "mercadopago",
    public_key: input.publicKey?.trim() || current.publicKey || null,
    access_token: input.accessToken?.trim() || current.accessToken || null,
    client_id: input.clientId?.trim() || current.clientId || null,
    client_secret: input.clientSecret?.trim() || current.clientSecret || null,
    environment: input.environment ?? current.environment ?? "production",
    active: true,
    rotated_at: now,
    updated_at: now,
    updated_by: input.updatedBy ?? null,
  };

  const { data: existing } = await supabaseAdmin
    .from("integration_credentials")
    .select("id")
    .eq("provider", "mercadopago")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("integration_credentials")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error("Não foi possível salvar as credenciais.");
  } else {
    const { error } = await supabaseAdmin.from("integration_credentials").insert(payload);
    if (error) throw new Error("Não foi possível salvar as credenciais.");
  }

  return resolveMercadoPagoCredentials();
}

/** Desativa as credenciais salvas no banco, voltando ao ambiente (ou desligando). */
export async function disableStoredCredentials() {
  await supabaseAdmin
    .from("integration_credentials")
    .update({
      access_token: null,
      public_key: null,
      client_id: null,
      client_secret: null,
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "mercadopago");
  return resolveMercadoPagoCredentials();
}

type TestResult = {
  ok: boolean;
  message: string;
  detail?: string;
  instructions?: string;
  account?: string | null;
};

function explain(status: number, code: string, raw: string): { message: string; instructions: string } {
  if (code === "invalid_token" || status === 401) {
    return {
      message: "Credencial recusada (token inválido ou expirado).",
      instructions:
        "Gere um novo Access Token em Suas integrações › Credenciais de produção no Mercado Pago e salve aqui novamente.",
    };
  }
  if (status === 403) {
    return {
      message: "Credencial sem permissão para esta operação.",
      instructions:
        "Verifique se a aplicação do Mercado Pago tem os escopos de pagamentos ativos e se está usando as credenciais de produção.",
    };
  }
  if (status === 429) {
    return {
      message: "Limite de chamadas atingido no Mercado Pago.",
      instructions: "Aguarde alguns segundos e teste novamente.",
    };
  }
  if (status >= 500) {
    return {
      message: "Mercado Pago indisponível no momento.",
      instructions: "É uma falha temporária do provedor. Tente novamente em alguns minutos.",
    };
  }
  return {
    message: `Falha na validação (HTTP ${status}).`,
    instructions: raw.slice(0, 240) || "Revise as credenciais informadas e tente novamente.",
  };
}

/** Testa o Access Token consultando os dados da conta no Mercado Pago. */
export async function testAccessToken(accessToken: string): Promise<TestResult> {
  if (!accessToken) {
    return {
      ok: false,
      message: "Nenhum Access Token configurado.",
      instructions: "Informe o Access Token de produção e salve antes de testar.",
    };
  }

  try {
    const response = await fetch(`${MP_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const raw = await response.text();

    if (response.ok) {
      let account: string | null = null;
      try {
        const parsed = JSON.parse(raw) as { nickname?: string; email?: string; id?: number };
        account = parsed.nickname ?? parsed.email ?? (parsed.id ? String(parsed.id) : null);
      } catch {
        account = null;
      }
      return {
        ok: true,
        message: "Access Token conectado com sucesso.",
        detail: account ? `Conta: ${account}` : undefined,
        account,
      };
    }

    let code = "";
    try {
      code = String((JSON.parse(raw) as { error?: string }).error ?? "");
    } catch {
      code = "";
    }
    const explained = explain(response.status, code, raw);
    return { ok: false, message: explained.message, detail: raw.slice(0, 240), instructions: explained.instructions };
  } catch (error) {
    return {
      ok: false,
      message: "Não foi possível contatar o Mercado Pago.",
      detail: error instanceof Error ? error.message : undefined,
      instructions: "Verifique a conexão do servidor e tente novamente.",
    };
  }
}

/** Testa Client ID + Client Secret via OAuth (grant_type=client_credentials). */
export async function testClientCredentials(clientId: string, clientSecret: string): Promise<TestResult> {
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message: "Client ID e Client Secret não configurados.",
      instructions:
        "Copie o Client ID e o Client Secret em Suas integrações › Detalhes da aplicação no Mercado Pago, salve e teste novamente.",
    };
  }

  try {
    const response = await fetch(`${MP_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const raw = await response.text();

    if (response.ok) {
      let scope: string | null = null;
      let expires: number | null = null;
      try {
        const parsed = JSON.parse(raw) as { scope?: string; expires_in?: number };
        scope = parsed.scope ?? null;
        expires = parsed.expires_in ?? null;
      } catch {
        scope = null;
      }
      return {
        ok: true,
        message: "Client ID e Client Secret válidos (OAuth conectado).",
        detail: [scope ? `Escopos: ${scope}` : null, expires ? `Token válido por ${expires}s` : null]
          .filter(Boolean)
          .join(" • "),
      };
    }

    let code = "";
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      code = String(parsed.error ?? parsed.message ?? "");
    } catch {
      code = "";
    }

    if (/client/i.test(code) || response.status === 400) {
      return {
        ok: false,
        message: "Client ID ou Client Secret incorretos.",
        detail: raw.slice(0, 240),
        instructions:
          "Confira se copiou os dois valores da mesma aplicação no Mercado Pago (Detalhes da aplicação) e sem espaços extras.",
      };
    }

    const explained = explain(response.status, code, raw);
    return { ok: false, message: explained.message, detail: raw.slice(0, 240), instructions: explained.instructions };
  } catch (error) {
    return {
      ok: false,
      message: "Não foi possível contatar o Mercado Pago.",
      detail: error instanceof Error ? error.message : undefined,
      instructions: "Verifique a conexão do servidor e tente novamente.",
    };
  }
}
