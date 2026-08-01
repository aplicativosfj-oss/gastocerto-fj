import { createFileRoute } from "@tanstack/react-router";
/**
 * Webhook do Mercado Pago: recebe a notificação do Pix e libera a licença.
 * A confirmação é sempre refeita contra a API do Mercado Pago — o corpo da
 * requisição nunca é tratado como fonte de verdade.
 */
export const Route = createFileRoute("/api/public/mercadopago/webhook")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                let body = null;
                try {
                    body = await request.json();
                }
                catch {
                    return new Response("Corpo inválido", { status: 400 });
                }
                const url = new URL(request.url);
                const externalId = String(body?.data?.id ?? body?.resource?.toString?.().split("/").pop() ?? url.searchParams.get("id") ?? "").trim();
                const type = String(body?.type ?? body?.topic ?? url.searchParams.get("topic") ?? "payment");
                if (!externalId || !/^\d+$/.test(externalId)) {
                    // Notificações de outros tópicos ou sem ID válido são reconhecidas sem processamento.
                    return new Response("ok");
                }
                try {
                    const { settlePixPayment } = await import("@/lib/mercadopago.server");
                    const result = await settlePixPayment(externalId);
                    console.log(`[mercadopago] pagamento ${externalId} => ${result.status}`);
                }
                catch (error) {
                    console.error("[mercadopago] falha ao reconciliar pagamento", error);
                    return new Response("erro ao processar", { status: 500 });
                }
                return new Response("ok");
            },
            GET: async () => new Response("ok"),
        },
    },
});
