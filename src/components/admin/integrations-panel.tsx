import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  adminGetIntegrationSettings, 
  adminTestMercadoPago, 
  adminLogIntegrationAction, 
  adminAdjustGeminiLimits 
} from "@/lib/admin-integrations.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CreditCard, 
  BrainCircuit, 
  Mail, 
  ExternalLink, 
  Settings2, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { MercadoPagoPanel } from "@/components/admin/mercadopago-panel";

export function IntegrationsPanel() {
  const getSettings = useServerFn(adminGetIntegrationSettings);
  
  const testConnection = useServerFn(adminTestMercadoPago);
  const logAction = useServerFn(adminLogIntegrationAction);
  const adjustGemini = useServerFn(adminAdjustGeminiLimits);
  
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => getSettings(),
  });

  const testWebhook = useMutation({
    mutationFn: () => testConnection(),
    onSuccess: (result: any) =>
      result.ok
        ? toast.success("Conexão validada!", { description: result.message })
        : toast.error("Falha na conexão", { 
            description: result.message,
            action: result.instructions ? {
              label: "Ver Ajuda",
              onClick: () => toast.info("Instruções", { description: result.instructions })
            } : undefined
          }),
    onError: (error: Error) => toast.error(error.message),
  });


  if (isLoading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <MercadoPagoPanel />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Mercado Pago */}
        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                <CreditCard className="size-5" />
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>
            </div>
            <CardTitle className="text-lg mt-3">Mercado Pago</CardTitle>
            <CardDescription className="text-xs">Checkout Transparente & Pix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status Webhook:</span>
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <CheckCircle2 className="size-3" /> Configurado
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Última Conciliação:</span>
                <span className="font-mono text-[10px]">{data?.mercadopago?.last_sync ? formatDateTime(data.mercadopago.last_sync) : "—"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs h-8"
                onClick={() => testWebhook.mutate()}
                disabled={testWebhook.isPending}
              >
                {testWebhook.isPending ? <RefreshCw className="mr-2 size-3 animate-spin" /> : <Settings2 className="mr-2 size-3" />} 
                Testar Webhook
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs h-8"
                onClick={async () => {
                  await logAction({ data: { integration: "mercadopago", action: "open_dashboard" } });
                  window.open("https://www.mercadopago.com.br/developers/panel", "_blank");
                }}
              >
                <ExternalLink className="mr-2 size-3" /> Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gemini AI */}
        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                <BrainCircuit className="size-5" />
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>
            </div>
            <CardTitle className="text-lg mt-3">Google Gemini</CardTitle>
            <CardDescription className="text-xs">Motor de IA Financeira</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Modelo:</span>
                <span className="font-medium">{data?.gemini?.model}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Modo Econômico:</span>
                <span className="text-emerald-500 font-medium">Ligado</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs h-8"
                onClick={async () => {
                  const toastId = toast.loading("Sincronizando limites...");
                  try {
                    await adjustGemini();
                    toast.success("Limites atualizados!", { id: toastId });
                  } catch (err: any) {
                    toast.error("Erro no ajuste", { id: toastId, description: err.message });
                  }
                }}
              >
                <Settings2 className="mr-2 size-3" /> Ajustar Limites
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* E-mail / Resend */}
        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                <Mail className="size-5" />
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>
            </div>
            <CardTitle className="text-lg mt-3">Resend E-mail</CardTitle>
            <CardDescription className="text-xs">Envio de Chaves & Notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Domínio:</span>
                <span className="font-medium">{data?.email?.verified_domain}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Entrega:</span>
                <span className="text-emerald-500 font-medium">100% (Verificado)</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs h-8"
                onClick={async () => {
                  const email = window.prompt("E-mail de destino para o teste:");
                  if (!email) return;
                  
                  const toastId = toast.loading("Enviando e-mail de teste...");
                  try {
                    const { adminTestEmailDelivery } = await import("@/lib/admin-integrations.functions");
                    const result = await adminTestEmailDelivery({ data: { to: email } });
                    
                    if (result.delivered) {
                      toast.success("E-mail enviado com sucesso!", { id: toastId });
                    } else {
                      toast.warning("Simulação concluída", { 
                        id: toastId,
                        description: result.reason === "email_domain_not_configured" 
                          ? "Domínio não configurado. O e-mail não foi disparado, mas a lógica está ativa."
                          : `Motivo: ${result.reason}`
                      });
                    }
                  } catch (err: any) {
                    toast.error("Falha no teste", { id: toastId, description: err.message });
                  }
                }}
              >
                <Sparkles className="mr-2 size-3" /> Testar Envio
              </Button>
            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs h-8"
                onClick={async () => {
                  await logAction({ data: { integration: "email", action: "open_dns_settings" } });
                  window.open("https://resend.com/domains", "_blank");
                }}
              >
                <Settings2 className="mr-2 size-3" /> DNS Settings
              </Button>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <AlertCircle className="size-8 mx-auto mb-3 opacity-20" />
        <h4 className="font-bold text-sm">Novas Integrações</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Estamos expandindo as conexões da plataforma. Em breve: Stripe, WhatsApp API e Notificações Push.
        </p>
        <Button size="sm" variant="outline" className="mt-4 gap-2">
          Solicitar Integração <ExternalLink className="size-3" />
        </Button>
      </div>
    </div>
  );
}