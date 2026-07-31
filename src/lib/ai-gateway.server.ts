import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Provedor da Lovable AI usado pelo consultor financeiro (somente servidor). */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}
