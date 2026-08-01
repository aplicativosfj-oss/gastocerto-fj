import { createFileRoute } from "@tanstack/react-router";

/**
 * Revalidação periódica dos pagamentos (chamada por agendamento pg_cron).
 * Reconsulta no Mercado Pago cada Pix pendente e corrige a situação gravada.
 * Protegido pela chave publicável do projeto no cabeçalho `apikey`.
 */
export const Route = createFileRoute("/api/public/mercadopago/reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? null;
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          null;

        if (!expected || !provided || provided !== expected) {
          return new Response(JSON.stringify({ error: "não autorizado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { reconcilePendingPayments } = await import("@/lib/mercadopago.server");
          const summary = await reconcilePendingPayments({ limit: 100, hours: 72 });
          return Response.json({
            ok: true,
            checked: summary.checked,
            corrected: summary.corrected,
            failed: summary.failed,
            ranAt: summary.ranAt,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[mercadopago] revalidação periódica falhou", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
