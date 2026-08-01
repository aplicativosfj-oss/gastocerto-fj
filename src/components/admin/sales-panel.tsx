import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

/**
 * Vendas & pagamentos: acompanha a receita do Pix (Mercado Pago), a situação de
 * cada cobrança e a chave de licença entregue ao cliente.
 */
export function SalesPanel() {
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "licenses"],
    queryFn: () => adminListLicenses(),
  });

  const licensesById = useMemo(() => {
    const map = new Map<string, any>();
    for (const license of (query.data?.licenses ?? []) as any[]) map.set(license.id, license);
    return map;
  }, [query.data]);

  const payments = useMemo(() => {
    const rows = ((query.data?.payments ?? []) as any[]).map((payment) => ({
      ...payment,
      license: payment.license_id ? licensesById.get(payment.license_id) : null,
    }));
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.email, row.license?.full_name, row.license?.license_key, row.external_id]
        .filter(Boolean)
        .some((value: string) => String(value).toLowerCase().includes(term)),
    );
  }, [query.data, licensesById, search]);

  const metrics = useMemo(() => {
    const all = ((query.data?.payments ?? []) as any[]).filter((p) => p.provider === "mercadopago" || true);
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
  }, [query.data]);

  const sync = async (paymentId: string) => {
    setSyncing(paymentId);
    try {
      const result = await getPixCheckoutStatus({ data: { paymentId } });
      toast.success(`Situação atualizada: ${STATUS_LABEL[result.status] ?? result.status}`);
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar o pagamento.");
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
          hint={`Conversão de ${metrics.conversion}% dos Pix gerados`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por e-mail, nome, chave ou ID do Mercado Pago"
          className="h-10 max-w-sm"
        />
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
                  Nenhuma venda registrada ainda. As cobranças Pix aparecem aqui automaticamente.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(payment.paid_at ?? payment.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="block font-medium">
                      {payment.license?.full_name ?? "—"}
                    </span>
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
                  <TableCell className="text-right">
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
    </div>
  );
}
