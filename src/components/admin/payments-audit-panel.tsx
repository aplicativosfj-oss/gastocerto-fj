import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { adminGetCheckoutAudit, adminSettleManualOrder } from "@/lib/admin-integrations.functions";
import { resendLicenseDelivery } from "@/lib/checkout.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  in_process: "Em análise",
  rejected: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const EVENT_LABEL: Record<string, string> = {
  status_change: "Situação atualizada",
  status_check: "Consulta ao Mercado Pago",
  license_released: "Chave liberada",
  key_email_sent: "Chave enviada por e-mail",
  key_email_fallback: "Chave em fallback",
};

/** Auditoria completa do checkout Pix: tentativas, cobranças, status e erros. */
export function PaymentsAuditPanel({ globalSearch = "" }: { globalSearch?: string }) {
  const getAudit = useServerFn(adminGetCheckoutAudit);
  const reconcile = useServerFn(adminReconcilePayments);

  const [search, setSearch] = useState(globalSearch);
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "checkout-audit", search, status, days],
    queryFn: () => getAudit({ data: { search: search || undefined, status, days } }),
  });

  const revalidate = useMutation({
    mutationFn: () => reconcile({ data: { hours: 24 * 7 } }),
    onSuccess: (result) => {
      toast.success("Revalidação concluída", {
        description: `${result.checked} verificados • ${result.corrected} corrigidos.`,
      });
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Metric label="Cobranças" value={summary?.total ?? 0} />
        <Metric label="Aprovadas" value={summary?.approved ?? 0} tone="success" />
        <Metric label="Pendentes" value={summary?.pending ?? 0} tone="warning" />
        <Metric label="Falhas" value={summary?.failed ?? 0} tone="danger" />
        <Metric label="Verificações" value={summary?.verificationsStarted ?? 0} />
        <Metric label="Confirmadas" value={summary?.verificationsConfirmed ?? 0} tone="success" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle className="text-base">Cobranças Pix</CardTitle>
              <CardDescription className="text-xs">
                Situação, erros do Mercado Pago e liberação da chave por transação.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="E-mail do cliente"
                  className="h-9 w-48 pl-8 text-xs"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="rejected">Recusadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
                <SelectTrigger className="h-9 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">12 meses</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 text-xs"
                disabled={revalidate.isPending || isFetching}
                onClick={() => revalidate.mutate()}
              >
                {revalidate.isPending || isFetching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="size-3.5" />
                )}
                Sincronizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (data?.charges ?? []).length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma cobrança no período selecionado.
            </p>
          ) : (
            (data?.charges ?? []).map((charge) => (
              <div key={charge.id} className="rounded-xl border border-border p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{charge.email ?? "sem e-mail"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(charge.createdAt)} • MP #{charge.externalId ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(charge.amount)}</span>
                    <Badge variant="outline" className={statusTone(charge.status)}>
                      {STATUS_LABEL[charge.status] ?? charge.status}
                    </Badge>
                    {charge.released ? (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                        Chave liberada
                      </Badge>
                    ) : null}
                    {charge.emailed ? (
                      <Badge variant="outline" className="text-[10px]">
                        E-mail enviado
                      </Badge>
                    ) : (
                      <ResendButton paymentId={charge.id} />
                    )}
                  </div>
                </div>

                {charge.statusDetail || charge.mpError ? (
                  <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-[11px] text-destructive">
                    {charge.mpError ?? charge.statusDetail}
                  </p>
                ) : null}

                {charge.events.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {charge.events.map((event, index) => (
                      <span
                        key={`${charge.id}-${index}`}
                        className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {EVENT_LABEL[event.type] ?? event.type}
                        {event.status ? ` · ${event.status}` : ""} · {event.source}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tentativas de checkout</CardTitle>
          <CardDescription className="text-xs">
            Verificações de e-mail iniciadas antes do cadastro — nenhuma conta é criada sem confirmação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.verifications ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma tentativa no período.</p>
          ) : (
            (data?.verifications ?? []).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.fullName} • {item.planSlug} / {item.cycle} • {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{item.attempts} tentativa(s)</span>
                  <Badge
                    variant="outline"
                    className={
                      item.consumed
                        ? "border-success/30 bg-success/10 text-success"
                        : item.verified
                          ? "border-brand/30 bg-brand/10 text-brand"
                          : item.expired
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : ""
                    }
                  >
                    {item.consumed
                      ? "Concluída"
                      : item.verified
                        ? "E-mail confirmado"
                        : item.expired
                          ? "Expirada"
                          : "Aguardando código"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function statusTone(status: string) {
  if (status === "approved") return "border-success/30 bg-success/10 text-success";
  if (["pending", "in_process"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ResendButton({ paymentId }: { paymentId: string }) {
  const resend = useServerFn(require("@/lib/checkout.functions").resendLicenseDelivery);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      const result = await resend({ data: { paymentId } });
      if (result.delivered) {
        toast.success("E-mail reenviado com sucesso.");
      } else {
        toast.info("Chave reprocessada, mas envio por e-mail ainda em fallback.", {
          description: "O domínio remetente pode não estar configurado.",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao reenviar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 gap-1 px-1.5 text-[10px] text-brand"
      disabled={loading}
      onClick={handleResend}
    >
      {loading ? <Loader2 className="size-2.5 animate-spin" /> : <Mail className="size-2.5" />}
      Reenviar
    </Button>
  );
}
