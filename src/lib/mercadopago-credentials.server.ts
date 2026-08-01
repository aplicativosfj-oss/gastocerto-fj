/**
 * Resolução, rotação e mascaramento das credenciais do Mercado Pago.
 *
 * Regras de segurança deste módulo:
 * - Os valores reais NUNCA saem daqui: quem consulta recebe apenas máscaras.
 * - A tabela `integration_credentials` só é acessível pelo service role, então
 *   nem o navegador nem um cliente autenticado conseguem ler o token.
 * - A prioridade é banco (rotação imediata pelo painel) e, na ausência, as
 *   variáveis de ambiente seguras do projeto.
 */

const PROVIDER = "mercadopago";
const CACHE_TTL_MS = 60_000;

export type MercadoPagoCredentials = {
  publicKey: string | null;
  accessToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  source: "database" | "environment" | "none";
  environment: string;
  rotatedAt: string | null;
  updatedAt: string | null;
};

let cache: { value: MercadoPagoCredentials; expiresAt: number } | null = null;

/** Invalida o cache — chamado sempre que o administrador rotaciona a credencial. */
export function invalidateCredentialsCache() {
  cache = null;
}

/** Mostra apenas o suficiente para o administrador reconhecer a credencial. */
export function maskCredential(value: string | null | undefined) {
  if (!value) return null;
  const clean = value.trim();
  if (clean.length <= 12) return `${clean.slice(0, 3)}••••`;
  return `${clean.slice(0, 8)}••••${clean.slice(-4)}`;
}

function fromEnvironment(): MercadoPagoCredentials {
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"] ?? null;
  const publicKey = process.env["MERCADOPAGO_PUBLIC_KEY"] ?? null;
  return {
    publicKey,
    accessToken,
    clientId: process.env["MERCADOPAGO_CLIENT_ID"] ?? null,
    clientSecret: process.env["MERCADOPAGO_CLIENT_SECRET"] ?? null,
    source: accessToken ? "environment" : "none",
    environment: accessToken?.startsWith("TEST-") ? "sandbox" : "production",
    rotatedAt: null,
    updatedAt: null,
  };
}

/** Credenciais efetivas usadas em toda chamada à API do Mercado Pago. */
export async function loadMercadoPagoCredentials(): Promise<MercadoPagoCredentials> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  let resolved = fromEnvironment();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("integration_credentials")
      .select("public_key, access_token, client_id, client_secret, environment, active, rotated_at, updated_at")
      .eq("provider", PROVIDER)
      .maybeSingle();

    if (data?.active && data.access_token) {
      resolved = {
        publicKey: (data.public_key as string | null) ?? resolved.publicKey,
        accessToken: data.access_token as string,
        clientId: (data.client_id as string | null) ?? resolved.clientId,
        clientSecret: (data.client_secret as string | null) ?? resolved.clientSecret,
        source: "database",
        environment: (data.environment as string) ?? "production",
        rotatedAt: (data.rotated_at as string | null) ?? null,
        updatedAt: (data.updated_at as string | null) ?? null,
      };
    }
  } catch (error) {
    console.error("[mercadopago] falha ao ler credenciais do banco", error);
  }

  cache = { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS };
  return resolved;
}

/** Token de acesso pronto para uso no servidor. */
export async function requireAccessToken() {
  const { accessToken } = await loadMercadoPagoCredentials();
  if (!accessToken) {
    throw new Error("Pagamento indisponível: credencial do Mercado Pago ausente.");
  }
  return accessToken;
}

/** Resumo seguro (mascarado) para exibição no painel administrativo. */
export async function describeMercadoPagoCredentials() {
  const credentials = await loadMercadoPagoCredentials();
  return {
    configured: Boolean(credentials.accessToken),
    source: credentials.source,
    environment: credentials.environment,
    publicKeyMask: maskCredential(credentials.publicKey),
    accessTokenMask: maskCredential(credentials.accessToken),
    clientIdMask: maskCredential(credentials.clientId),
    clientSecretMask: maskCredential(credentials.clientSecret),
    oauthConfigured: Boolean(credentials.clientId && credentials.clientSecret),
    rotatedAt: credentials.rotatedAt,
    updatedAt: credentials.updatedAt,
    webhookUrl: "https://gastocerto-fj.lovable.app/api/public/mercadopago/webhook",
  };
}

/** Grava (rotaciona) as credenciais e aplica a mudança imediatamente. */
export async function saveMercadoPagoCredentials(input: {
  publicKey: string;
  accessToken: string;
  clientId?: string | null;
  clientSecret?: string | null;
  updatedBy: string;
}) {
  const publicKey = input.publicKey.trim();
  const accessToken = input.accessToken.trim();
  const clientId = input.clientId?.trim() || null;
  const clientSecret = input.clientSecret?.trim() || null;
  if (accessToken.length < 20) throw new Error("Access token inválido.");
  if (publicKey.length < 20) throw new Error("Public key inválida.");
  if (clientSecret && !clientId) throw new Error("Informe também o Client ID.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("integration_credentials").upsert(
    {
      provider: PROVIDER,
      public_key: publicKey,
      access_token: accessToken,
      ...(clientId ? { client_id: clientId } : {}),
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      environment: accessToken.startsWith("TEST-") ? "sandbox" : "production",
      active: true,
      rotated_at: new Date().toISOString(),
      updated_by: input.updatedBy,
    },
    { onConflict: "provider" },
  );
  if (error) throw new Error("Não foi possível salvar as credenciais.");

  invalidateCredentialsCache();
  return describeMercadoPagoCredentials();
}

/** Volta a usar as variáveis de ambiente do projeto (desativa a rotação manual). */
export async function disableStoredCredentials(updatedBy: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("integration_credentials")
    .update({ active: false, updated_by: updatedBy })
    .eq("provider", PROVIDER);
  invalidateCredentialsCache();
  return describeMercadoPagoCredentials();
}

/**
 * Testa a credencial contra a API do Mercado Pago sem criar cobrança:
 * consulta os métodos de pagamento disponíveis para a conta.
 */
export async function testMercadoPagoCredentials() {
  const credentials = await loadMercadoPagoCredentials();
  if (!credentials.accessToken) {
    return { ok: false, status: 0, message: "Nenhuma credencial configurada.", pixEnabled: false };
  }

  const started = Date.now();
  const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`[mercadopago] teste de credencial falhou [${response.status}]: ${text}`);
    let errorMessage = `Mercado Pago recusou a credencial [${response.status}]`;
    let instructions = "Verifique se o token copiado está completo e sem espaços.";
    
    try {
      const errorJson = JSON.parse(text);
      const mpCode = errorJson.message || errorJson.error;
      
      if (mpCode === "invalid_token") {
        errorMessage = "Token Inválido";
        instructions = "O Access Token expirou ou não pertence a esta conta. Gere um novo no Painel do Desenvolvedor.";
      } else if (mpCode === "unauthorized") {
        errorMessage = "Não Autorizado";
        instructions = "A conta não tem permissão para usar esta API. Verifique se é uma conta de Vendedor.";
      } else if (response.status === 403) {
        errorMessage = "Acesso Negado";
        instructions = "O Mercado Pago bloqueou a requisição. Verifique se o IP do servidor não está restrito.";
      }
      
      errorMessage = `${errorMessage}: ${mpCode || text.slice(0, 50)}`;
    } catch {
      errorMessage = `${errorMessage}: ${text.slice(0, 100)}`;
    }
    
    return {
      ok: false,
      status: response.status,
      latencyMs: Date.now() - started,
      message: errorMessage,
      instructions,
      pixEnabled: false,
    };
  }

  const methods = JSON.parse(text) as Array<{ id?: string; status?: string }>;
  return {
    ok: true,
    status: response.status,
    latencyMs: Date.now() - started,
    message: `Credencial válida (${methods.length} meios de pagamento habilitados).`,
    pixEnabled: methods.some((method) => method.id === "pix"),
  };
}
