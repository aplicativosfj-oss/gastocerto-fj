import { useQuery } from "@tanstack/react-query";
import { adminGetIntegrationSettings } from "@/lib/admin-integrations.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  BrainCircuit, 
  Mail, 
  ExternalLink, 
  Settings2, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

export function IntegrationsPanel() {
  const getSettings = useServerFn(adminGetIntegrationSettings);
  
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => getSettings(),
  });

  if (isLoading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Mercado Pago */}
        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                <CreditCard className="size-5" />
              </div>
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>
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
                <span className="font-mono text-[10px]">{data?.mercadopago?.last_sync ? formatDateTime(data.mercadopago.last_sync) : '—'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="w-full text-xs h-8">
                <Settings2 className="mr-2 size-3" /> Configurar
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs h-8">
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
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>
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
            <Button size="sm" variant="outline" className="w-full text-xs h-8">
              <Settings2 className="mr-2 size-3" /> Ajustar Limites
            </Button>
          </CardContent>
        </Card>

        {/* E-mail / Resend */}
        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                <Mail className="size-5" />
              </div>
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>
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
            <Button size="sm" variant="outline" className="w-full text-xs h-8">
              <Settings2 className="mr-2 size-3" /> DNS Settings
            </Button>
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