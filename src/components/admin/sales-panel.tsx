import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { getPixCheckoutStatus } from "@/lib/checkout.functions";
import { adminListLicenses } from "@/lib/licenses.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  in_process: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const EVENT_LABEL: Record<string, string> = {
  status_change: "Situação alterada",
  status_check: "Consulta ao Mercado Pago",
  license_released: "Chave de ativação liberada",
  key_email_sent: "Chave enviada por e-mail",
  key_email_fallback: "Chave disponível na página do pedido",
};

const PERIODS = [
  { value: "all", label: "Todo o período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "month", label: "Mês atual" },
] as const;

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "income" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1 text-xl font-extrabold tracking-tight",
          tone === "income" && "text-income",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Histórico auditável de um pagamento, lido da trilha de eventos. */
function PaymentDetail({ payment, onSync }: { payment: any; onSync: () => Promise<void> }) {
  const events = useQuery({
    queryKey: ["admin", "payment-events", payment.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_events")
        .select("id, event_type, status, source, detail, created_at")
        .eq("payment_id", payment.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const orderUrl = `${window.location.origin}/pedido/${payment.id}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </p>
          <p className="font-medium">{payment.license?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{payment.email ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cobrança
          </p>
          <p className="tabular font-semibold">{formatCurrency(Number(payment.amount ?? 0))}</p>
          <p className="text-xs text-muted-foreground">
            {payment.license?.plans?.name ?? "—"} ·{" "}
            {payment.license?.billing_cycle === "annual" ? "Anual" : "Mensal"} ·{" "}
            {String(payment.method ?? "pix").toUpperCase()}
          </p>
        </div>
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <p className="text-muted-foreground">
          ID Mercado Pago:{" "}
          <span className="font-mono text-foreground">{payment.external_id ?? "—"}</span>
        </p>
        <p className="text-muted-foreground">
          Chave:{" "}
          <span className="font-mono text-foreground">
            {payment.license?.license_key ?? "—"}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void onSync()}>
          <RefreshCw className="mr-2 size-4" aria-hidden="true" />
          Reconsultar no Mercado Pago
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(orderUrl);
            toast.success("Link do pedido copiado.");
          }}
        >
          <ExternalLink className="mr-2 size-4" aria-hidden="true" />
          Copiar link do pedido
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico de status
        </p>
        {events.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando histórico…</p>
        ) : (events.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado para esta cobrança.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(events.data ?? []).map((event: any) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {EVENT_LABEL[event.event_type] ?? event.event_type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.status ? `${STATUS_LABEL[event.status] ?? event.status} · ` : ""}
                  {event.source} · {formatDateTime(event.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Vendas & pagamentos: acompanha a receita do Pix (Mercado Pago), a situação de
 * cada cobrança, o histórico de eventos e a chave de licença entregue.
 */
export function SalesPanel() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState<string>("all");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "licenses"],
    queryFn: () => adminListLicenses(),
  });

  const licensesById = useMemo(() => {
    const map = new Map<string, any>();
    for (const license of (query.data?.licenses ?? []) as any[]) map.set(license.id, license);
    return map;
  }, [query.data]);

  const allRows = useMemo(
    () =>
      ((query.data?.payments ?? []) as any[]).map((payment) => ({
        ...payment,
        license: payment.license_id ? licensesById.get(payment.license_id) : null,
      })),
    [query.data, licensesById],
  );

  const payments = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    return allRows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (period !== "all") {
        const date = new Date(row.paid_at ?? row.created_at);
        if (period === "month") {
          if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear())
            return false;
        } else {
          const days = Number(period);
          if (now.getTime() - date.getTime() > days * 86400000) return false;
        }
      }
      if (!term) return true;
      return [row.email, row.license?.full_name, row.license?.license_key, row.external_id]
        .filter(Boolean)
        .some((value: string) => String(value).toLowerCase().includes(term));
    });
  }, [allRows, search, status, period]);

  const metrics = useMemo(() => {
    const all = payments;
    const approved = all.filter((p) => p.status === "approved");
    const now = new Date();
    const monthRevenue = approved
      .filter((p) => {
        const date = new Date(p.paid_at ?? p.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const total = approved.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const pending = all.filter((p) => ["pending", "in_process"].includes(p.status));
    return {
      total,
      monthRevenue,
      approvedCount: approved.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
      ticket: approved.length ? total / approved.length : 0,
      conversion: all.length ? Math.round((approved.length / all.length) * 100) : 0,
    };
  }, [payments]);

  const sync = async (paymentId: string) => {
    setSyncing(paymentId);
    try {
      const result = await getPixCheckoutStatus({ data: { paymentId } });
      toast.success(`Situação atualizada: ${STATUS_LABEL[result.status] ?? result.status}`);
      await query.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível consultar o pagamento.",
      );
    } finally {
      setSyncing(null);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Chave copiada.");
    } catch {
      toast.error("Copie manualmente a chave exibida.");
    }
  };

  const detail = payments.find((row) => row.id === detailId) ?? null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Receita confirmada"
          value={formatCurrency(metrics.total)}
          hint={`${metrics.approvedCount} pagamento(s) aprovado(s)`}
          tone="income"
        />
        <MetricCard
          label="Receita do mês"
          value={formatCurrency(metrics.monthRevenue)}
          hint="Pix aprovados no mês atual"
          tone="income"
        />
        <MetricCard
          label="Aguardando pagamento"
          value={formatCurrency(metrics.pendingAmount)}
          hint={`${metrics.pendingCount} cobrança(s) pendente(s)`}
          tone="muted"
        />
        <MetricCard
          label="Ticket médio"
          value={formatCurrency(metrics.ticket)}
          hint={`Conversão de ${metrics.conversion}% dos Pix filtrados`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="E-mail, nome, chave ou ID do Mercado Pago"
            className="h-10 pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-[170px]">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-10 w-[170px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-10" onClick={() => void query.refetch()}>
          <RefreshCw className="mr-2 size-4" aria-hidden="true" />
          Atualizar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Chave entregue</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Carregando vendas…
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma venda para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="cursor-pointer"
                  onClick={() => setDetailId(payment.id)}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(payment.paid_at ?? payment.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="block font-medium">{payment.license?.full_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{payment.email ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {payment.license?.plans?.name ?? "—"}
                    <span className="block text-xs text-muted-foreground">
                      {payment.license?.billing_cycle === "annual" ? "Anual" : "Mensal"} ·{" "}
                      {payment.method?.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap font-semibold">
                    {formatCurrency(Number(payment.amount ?? 0))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "approved" ? "default" : "secondary"}>
                      {STATUS_LABEL[payment.status] ?? payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.status === "approved" ? (payment.license?.license_key ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      {payment.license?.license_key && payment.status === "approved" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void copy(payment.license.license_key)}
                        >
                          <Copy className="size-4" aria-hidden="true" />
                          <span className="sr-only">Copiar chave</span>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncing === payment.id}
                        onClick={() => void sync(payment.id)}
                      >
                        {syncing === payment.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCw className="size-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">Consultar no Mercado Pago</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da venda</DialogTitle>
            <DialogDescription>
              Situação atual, histórico de eventos e entrega da chave de ativação.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <PaymentDetail payment={detail} onSync={() => sync(detail.id)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
