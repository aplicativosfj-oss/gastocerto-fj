import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, Loader2, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  adminGetIntegrationSettings,
  adminReconcilePayments,
  adminSaveMercadoPagoCredentials,
  adminTestMercadoPago,
} from "@/lib/admin-integrations.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

/**
 * Configuração e teste das credenciais do Mercado Pago.
 * A tela só recebe máscaras do servidor — os valores reais nunca chegam ao navegador.
 */
export function MercadoPagoPanel() {
  const queryClient = useQueryClient();
  const getSettings = useServerFn(adminGetIntegrationSettings);
  const saveCredentials = useServerFn(adminSaveMercadoPagoCredentials);
  const testConnection = useServerFn(adminTestMercadoPago);
  const reconcile = useServerFn(adminReconcilePayments);

  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => getSettings(),
  });
  const mp = data?.mercadopago;

  const save = useMutation({
    mutationFn: () => saveCredentials({ data: { publicKey, accessToken } }),
    onSuccess: (result) => {
      setPublicKey("");
      setAccessToken("");
      queryClient.invalidateQueries({ queryKey: ["admin", "integrations"] });
      toast.success("Credenciais rotacionadas", {
        description: `Ambiente ${result.environment} • token ${result.accessTokenMask} já ativo no servidor.`,
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const test = useMutation({
    mutationFn: () => testConnection(),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Conexão validada", {
          description: `${result.message}${result.pixEnabled ? " Pix habilitado." : " Pix não habilitado na conta."}`,
        });
      } else {
        toast.error("Credencial recusada", { 
          description: result.message,
          duration: 6000 
        });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revalidate = useMutation({
    mutationFn: () => reconcile({ data: { hours: 72 } }),
    onSuccess: (result) =>
      toast.success("Revalidação concluída", {
        description: `${result.checked} pagamentos verificados • ${result.corrected} corrigidos • ${result.failed} com erro.`,
      }),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-brand/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-brand" /> Credenciais do Mercado Pago
            </CardTitle>
            <CardDescription className="text-xs">
              Guardadas apenas no servidor, exibidas mascaradas e aplicadas imediatamente.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              mp?.configured
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }
          >
            {mp?.configured ? "Configurado" : "Ausente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs sm:grid-cols-2">
          <Info label="Public key" value={mp?.publicKeyMask ?? "—"} />
          <Info label="Access token" value={mp?.accessTokenMask ?? "—"} />
          <Info label="Origem" value={mp?.source === "database" ? "Rotação pelo painel" : "Variável de ambiente"} />
          <Info label="Ambiente" value={mp?.environment === "sandbox" ? "Teste" : "Produção"} />
          <Info label="Última rotação" value={mp?.rotatedAt ? formatDateTime(mp.rotatedAt) : "—"} />
          <Info label="Última conciliação" value={mp?.last_sync ? formatDateTime(mp.last_sync) : "—"} />
          <div className="sm:col-span-2 break-all">
            <span className="text-muted-foreground">Webhook: </span>
            <span className="font-mono text-[11px]">{mp?.webhookUrl}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mp-public" className="text-xs">
              Nova Public key
            </Label>
            <Input
              id="mp-public"
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              placeholder="APP_USR-..."
              autoComplete="off"
              spellCheck={false}
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-token" className="text-xs">
              Novo Access token
            </Label>
            <Input
              id="mp-token"
              type="password"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="APP_USR-..."
              autoComplete="new-password"
              spellCheck={false}
              className="h-9 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-9 gap-2 text-xs"
            disabled={save.isPending || publicKey.trim().length < 20 || accessToken.trim().length < 20}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            {save.isPending ? "Aplicando..." : "Salvar e aplicar agora"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 text-xs"
            disabled={test.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Testar conexão
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 text-xs"
            disabled={revalidate.isPending}
            onClick={() => revalidate.mutate()}
          >
            {revalidate.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
            Revalidar pagamentos (72h)
          </Button>
        </div>

        <p className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          A revalidação também roda automaticamente pelo agendamento do servidor. Após rotacionar as
          credenciais, o novo token passa a valer em todas as cobranças em menos de um minuto.
        </p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] font-medium">{value}</span>
    </div>
  );
}
