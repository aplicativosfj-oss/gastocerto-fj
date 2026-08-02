import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getEmailRollout,
  saveEmailRollout,
  sendEmailRolloutTest,
} from "@/lib/email-rollout.functions";

/**
 * Assistente guiado: configurar o domínio de envio, testar o aviso e só depois
 * liberar as notificações por e-mail para todos os clientes.
 */
export function EmailSetupPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "email-rollout"],
    queryFn: () => getEmailRollout(),
  });

  const [domain, setDomain] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!data) return;
    setDomain(data.senderDomain ?? "");
    setTestEmail(data.testEmail ?? "");
    setNote(data.note ?? "");
  }, [data]);

  const save = useMutation({
    mutationFn: (input: Parameters<typeof saveEmailRollout>[0] extends never ? never : any) =>
      saveEmailRollout({ data: input }),
    onSuccess: () => {
      toast.success("Configuração de e-mail salva");
      void queryClient.invalidateQueries({ queryKey: ["admin", "email-rollout"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const test = useMutation({
    mutationFn: (email: string) => sendEmailRolloutTest({ data: { email } }),
    onSuccess: () => {
      toast.success("Teste enviado. Confira a central de avisos do app.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "email-rollout"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const steps = [
    {
      key: "domain",
      title: "1. Informar o domínio de envio",
      done: Boolean(data?.senderDomain),
      hint: "Use um subdomínio dedicado, por exemplo avisos.seudominio.com.br.",
    },
    {
      key: "verify",
      title: "2. Confirmar a verificação do domínio",
      done: Boolean(data?.domainReady),
      hint: "Marque quando o domínio aparecer como verificado na área de e-mails do backend.",
    },
    {
      key: "test",
      title: "3. Testar o envio",
      done: Boolean(data?.testSentAt),
      hint: "Dispara um aviso de teste para validar todo o fluxo antes de liberar.",
    },
    {
      key: "release",
      title: "4. Liberar para todos os clientes",
      done: Boolean(data?.enabledForAll),
      hint: "Só libere depois que o teste chegar corretamente.",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-brand" />
              Assistente de e-mail
            </CardTitle>
            <Badge variant={data?.enabledForAll ? "default" : "secondary"}>
              {data?.enabledForAll ? "Liberado para todos" : "Em configuração"}
            </Badge>
          </div>
          <CardDescription>
            Configure o domínio, teste o envio e só então libere as notificações por e-mail do
            Espaço Kids e dos alertas financeiros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2">
            {steps.map((step) => (
              <li
                key={step.key}
                className="flex items-start gap-2 rounded-xl border border-border bg-secondary/30 p-3"
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Domínio e liberação</CardTitle>
          <CardDescription>
            Enquanto o domínio não estiver verificado, os avisos continuam chegando pela central de
            notificações do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sender-domain">Domínio de envio</Label>
              <Input
                id="sender-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="avisos.seudominio.com.br"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="test-email">E-mail para teste</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="voce@seudominio.com.br"
                />
                <Button
                  variant="outline"
                  onClick={() => test.mutate(testEmail)}
                  disabled={test.isPending || !testEmail.includes("@")}
                >
                  {test.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
              {data?.testSentAt ? (
                <p className="text-[11px] text-muted-foreground">
                  Último teste: {new Date(data.testSentAt).toLocaleString("pt-BR")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rollout-note">Observações internas</Label>
            <Textarea
              id="rollout-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Registros da configuração, responsável, data da verificação..."
            />
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Domínio verificado</p>
                <p className="text-xs text-muted-foreground">
                  Marque após a confirmação da verificação.
                </p>
              </div>
              <Switch
                checked={Boolean(data?.domainReady)}
                onCheckedChange={(checked) => save.mutate({ domainReady: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Liberar e-mails para todos</p>
                <p className="text-xs text-muted-foreground">
                  Requer domínio verificado e teste concluído.
                </p>
              </div>
              <Switch
                checked={Boolean(data?.enabledForAll)}
                disabled={!data?.domainReady || !data?.testSentAt}
                onCheckedChange={(checked) => save.mutate({ enabledForAll: checked })}
              />
            </div>
          </div>

          <Button
            onClick={() =>
              save.mutate({
                senderDomain: domain.trim() ? domain.trim() : null,
                note: note.trim() ? note.trim() : null,
              })
            }
            disabled={save.isPending}
            className="w-full sm:w-auto"
          >
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Salvar configuração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
