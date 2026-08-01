import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Mail,
  QrCode,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminAdjustGeminiLimits,
  adminGetIntegrationSettings,
  adminLogIntegrationAction,
  adminSaveManualPaymentSettings,
  adminTestEmailDelivery,
} from "@/lib/admin-integrations.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

/** Integrações ativas: recebimento manual via Pix, IA e e-mail. */
export function IntegrationsPanel() {
  const getSettings = useServerFn(adminGetIntegrationSettings);
  const saveManual = useServerFn(adminSaveManualPaymentSettings);
  const logAction = useServerFn(adminLogIntegrationAction);
  const adjustGemini = useServerFn(adminAdjustGeminiLimits);
  const testEmail = useServerFn(adminTestEmailDelivery);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => getSettings(),
    refetchInterval: 20_000,
  });

  const [form, setForm] = useState({
    pixKey: "",
    pixKeyType: "cpf" as PixKeyType,
    holder: "",
    bank: "",
    whatsapp: "",
    instructions: "",
  });

  useEffect(() => {
    if (!data?.manual_payment) return;
    const manual = data.manual_payment;
    setForm({
      pixKey: manual.pixKey,
      pixKeyType: manual.pixKeyType,
      holder: manual.holder,
      bank: manual.bank,
      whatsapp: manual.whatsapp,
      instructions: manual.instructions,
    });
  }, [data?.manual_payment]);

  const save = useMutation({
    mutationFn: () => saveManual({ data: form }),
    onSuccess: () => {
      toast.success("Dados de recebimento salvos", {
        description: "O checkout do site já exibe as novas instruções.",
      });
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const manual = data?.manual_payment;

  return (
    <div className="space-y-6">
      <Card className="border-brand/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <QrCode className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Recebimento manual (Pix)</CardTitle>
                <CardDescription className="text-xs">
                  Sem provedor externo: o cliente paga no seu Pix e você confirma em Vendas e pagamentos.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  manual?.configured
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                }
              >
                {manual?.configured ? (
                  <>
                    <CheckCircle2 className="mr-1 size-3" /> Configurado
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1 size-3" /> Falta a chave Pix
                  </>
                )}
              </Badge>
              {manual?.pending_orders ? (
                <Badge variant="outline" className="text-[10px]">
                  {manual.pending_orders} pedido(s) aguardando
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de chave</Label>
              <Select
                value={form.pixKeyType}
                onValueChange={(value) => setForm((prev) => ({ ...prev, pixKeyType: value as PixKeyType }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Chave Pix</Label>
              <Input
                value={form.pixKey}
                onChange={(event) => setForm((prev) => ({ ...prev, pixKey: event.target.value }))}
                placeholder="Chave que aparece para o cliente"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Titular</Label>
              <Input
                value={form.holder}
                onChange={(event) => setForm((prev) => ({ ...prev, holder: event.target.value }))}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Banco</Label>
              <Input
                value={form.bank}
                onChange={(event) => setForm((prev) => ({ ...prev, bank: event.target.value }))}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp para comprovante</Label>
              <Input
                value={form.whatsapp}
                onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                placeholder="(68) 99203-1340"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Instruções exibidas no checkout</Label>
            <Textarea
              value={form.instructions}
              onChange={(event) => setForm((prev) => ({ ...prev, instructions: event.target.value }))}
              rows={3}
              className="text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Atualizado em {manual?.updated_at ? formatDateTime(manual.updated_at) : "—"}
              {manual?.last_event
                ? ` • último evento ${formatDateTime(manual.last_event)} (${manual.last_event_source ?? "—"})`
                : ""}
            </p>
            <Button size="sm" className="h-9 gap-2 text-xs" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
              Salvar dados de recebimento
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                <BrainCircuit className="size-5" />
              </div>
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                Ativo
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base">Google Gemini</CardTitle>
            <CardDescription className="text-xs">Motor de IA financeira</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Modelo</span>
              <span className="font-medium">{data?.gemini?.model}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Modo econômico</span>
              <span className="font-medium text-success">
                {data?.gemini?.economy_mode ? "Ligado" : "Desligado"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs"
              onClick={async () => {
                const toastId = toast.loading("Sincronizando limites...");
                try {
                  await adjustGemini();
                  toast.success("Limites atualizados", { id: toastId });
                } catch (error) {
                  toast.error("Erro no ajuste", {
                    id: toastId,
                    description: error instanceof Error ? error.message : undefined,
                  });
                }
              }}
            >
              <Settings2 className="mr-2 size-3" /> Ajustar limites
            </Button>
          </CardContent>
        </Card>

        <Card className="border-brand/20 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                <Mail className="size-5" />
              </div>
              <Badge variant="outline" className="text-[10px]">
                {data?.email?.provider}
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base">Envio de e-mails</CardTitle>
            <CardDescription className="text-xs">Códigos de verificação e chaves de licença</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Domínio</span>
              <span className="font-medium">{data?.email?.verified_domain}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs"
              onClick={async () => {
                const email = window.prompt("E-mail de destino para o teste:");
                if (!email) return;
                const toastId = toast.loading("Enviando e-mail de teste...");
                try {
                  const result = await testEmail({ data: { to: email } });
                  if (result.delivered) {
                    toast.success("E-mail enviado com sucesso", { id: toastId });
                  } else {
                    toast.warning("Simulação concluída", {
                      id: toastId,
                      description:
                        result.reason === "email_domain_not_configured"
                          ? "Domínio remetente ainda não configurado."
                          : `Motivo: ${result.reason}`,
                    });
                  }
                } catch (error) {
                  toast.error("Falha no teste", {
                    id: toastId,
                    description: error instanceof Error ? error.message : undefined,
                  });
                }
              }}
            >
              <Sparkles className="mr-2 size-3" /> Testar envio
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs"
              onClick={async () => {
                await logAction({ data: { integration: "email", action: "open_dns_settings" } });
                window.open("https://resend.com/domains", "_blank");
              }}
            >
              <ExternalLink className="mr-2 size-3" /> Configurar domínio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
