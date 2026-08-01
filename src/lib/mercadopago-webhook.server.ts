import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { adminSettleManualOrder } from "@/lib/admin-integrations.functions";
import { getMercadoPagoCredentials } from "@/lib/mercadopago-credentials.server";

export async function processMercadoPagoWebhook(externalId: string, topic: string) {
  console.log(`[Webhook] Processing ${topic} ID: ${externalId}`);

  // Se for merchant_order, precisamos pegar o ID do pagamento dentro dela
  let paymentId = externalId;
  
  const { accessToken } = await getMercadoPagoCredentials();
  if (!accessToken) {
    console.error("[Webhook] No access token configured");
    return;
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
       console.error(`[Webhook] Failed to fetch payment ${paymentId}: ${response.status}`);
       return;
    }

    const mpPayment = await response.json();
    const status = mpPayment.status; // approved, pending, etc.
    
    // Localizar o pagamento no nosso banco pelo external_id (ID do Mercado Pago)
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, status, license_id")
      .eq("external_id", paymentId)
      .maybeSingle();

    if (!payment) {
      console.log(`[Webhook] Payment ${paymentId} not found in our database. Skipping.`);
      return;
    }

    // Se o status mudou para aprovado, liquidamos o pedido
    if (status === "approved" && payment.status !== "approved") {
      // Usamos a função administrativa existente para garantir que a licença seja liberada corretamente
      await adminSettleManualOrder({ data: { paymentId: payment.id, status: "approved" } });
      console.log(`[Webhook] Payment ${payment.id} (${paymentId}) auto-approved and license released.`);
    } else if (status !== payment.status) {
      // Apenas atualizamos o status se for diferente (ex: rejected, cancelled)
      await supabaseAdmin
        .from("payments")
        .update({ status: status })
        .eq("id", payment.id);
        
      // Logamos o evento
      await supabaseAdmin.from("payment_events").insert({
        payment_id: payment.id,
        license_id: payment.license_id,
        event_type: "status_change",
        status: status,
        source: "mercadopago_webhook",
        detail: { mp_status: status, topic }
      });
      console.log(`[Webhook] Payment ${payment.id} status updated to ${status}.`);
    }

  } catch (error) {
    console.error(\"[Webhook] Error processing MP payment:\", error);
  }
}
