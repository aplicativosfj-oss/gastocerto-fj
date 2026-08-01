import { useMemo, useState } from "react";
import { CreditCard, Plus, Sparkles } from "lucide-react";

import { CreditPurchaseDialog } from "@/components/finance/credit-purchase-dialog";
import { MetricDetailDialog, type MetricDetail } from "@/components/finance/metric-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { creditPurchases, summarizeByCard } from "@/lib/credit-purchases";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction } from "@/lib/transactions";
import { useAccounts } from "@/lib/transactions";

/**
 * Resumo mensal dos gastos por cartão de crédito, destacando o total gasto em
 * compras de créditos e o consolidado do mês. Cada cartão abre o detalhamento.
 */
export function CardMonthSummary({
  transactions,
  categories,
  monthLabel,
}: {
  transactions: Transaction[];
  categories: Category[];
  monthLabel: string;
}) {
  const { data: accounts } = useAccounts();
  const [detail, setDetail] = useState<MetricDetail | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const cards = useMemo(
    () =>
      (accounts ?? [])
        .filter((account) => account.account_type === "credit_card")
        .map((account) => ({ id: account.id, name: account.name })),
    [accounts],
  );

  const summary = useMemo(() => summarizeByCard(transactions, cards), [transactions, cards]);
  const purchases = useMemo(() => creditPurchases(transactions), [transactions]);

  const consolidated = summary.reduce((sum, item) => sum + item.total, 0);
  const creditsTotal = summary.reduce((sum, item) => sum + item.creditTotal, 0);
  const creditsQty = purchases.reduce((sum, item) => sum + item.credits, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4 text-primary" aria-hidden />
            Cartões de crédito · {monthLabel}
          </h2>
          <p className="text-xs text-muted-foreground">
            Consolidado {formatCurrency(consolidated)} · compras de créditos{" "}
            {formatCurrency(creditsTotal)}
            {creditsQty > 0 ? ` (${creditsQty} créditos)` : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setBatchOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden />
          Créditos em lote
        </Button>
      </div>

      {summary.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma despesa em cartão de crédito neste mês.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {summary.map((item) => (
            <li key={item.accountId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                onClick={() =>
                  setDetail({
                    label: `${item.name} · ${monthLabel}`,
                    value: formatCurrency(item.total),
                    hint: `${item.count} lançamento(s) no cartão`,
                    formula:
                      "Soma de todas as despesas do mês vinculadas a este cartão de crédito.",
                    rows: item.rows,
                    extra: [
                      { label: "Compras de créditos", value: formatCurrency(item.creditTotal) },
                      { label: "Créditos adquiridos", value: String(item.credits) },
                      {
                        label: "Preço médio por crédito",
                        value:
                          item.credits > 0
                            ? formatCurrency(item.creditTotal / item.credits)
                            : "—",
                      },
                    ],
                  })
                }
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} lançamento(s)
                    {item.creditCount > 0
                      ? ` · ${item.creditCount} compra(s) de créditos`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.total)}</p>
                  {item.creditTotal > 0 && (
                    <Badge variant="secondary" className="mt-1 gap-1">
                      <Sparkles className="size-3" aria-hidden />
                      {formatCurrency(item.creditTotal)} em créditos
                    </Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {purchases.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Compras de créditos do mês
          </p>
          <ul className="mt-2 divide-y divide-border">
            {purchases.map((item) => (
              <li key={item.id} className="grid gap-1 py-2 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-3">
                <span className="min-w-0 truncate">{item.description}</span>
                <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.credits > 0
                    ? `${item.credits} × ${formatCurrency(item.pricePerCredit)}`
                    : "—"}
                </span>
                <span className="font-semibold tabular-nums sm:text-right">
                  {formatCurrency(item.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CreditPurchaseDialog open={batchOpen} onOpenChange={setBatchOpen} />
      <MetricDetailDialog
        detail={detail}
        categories={categories}
        onOpenChange={(next) => !next && setDetail(null)}
        onEditTransaction={(row) => {
          setDetail(null);
          setEditingTx(row);
        }}
      />
      <TransactionDialog
        open={Boolean(editingTx)}
        onOpenChange={(next) => {
          if (!next) setEditingTx(null);
        }}
        kind={editingTx?.transaction_type === "income" ? "income" : "expense"}
        transaction={editingTx}
      />
    </section>
  );
}
