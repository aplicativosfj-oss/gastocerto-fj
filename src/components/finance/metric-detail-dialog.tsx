import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryIcon } from "@/lib/category-icons";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction } from "@/lib/transactions";

export type MetricDetail = {
  label: string;
  value: string;
  totalInvoiced?: string;

  hint?: string;
  /** Lançamentos que formam o número do card. */
  rows: Transaction[];
  /** Explicação de como o valor é calculado. */
  formula: string;
  /** Linhas extras de contexto (comparações, projeções). */
  extra?: Array<{ label: string; value: string }>;
};

/**
 * Detalhamento visual de um card do painel: como o número é calculado,
 * a divisão por categoria e a lista dos lançamentos que o compõem.
 */
export function MetricDetailDialog({
  detail,
  categories,
  onOpenChange,
}: {
  detail: MetricDetail | null;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
}) {
  const byCategory = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, { name: string; color?: string | null; icon?: string | null; total: number }>();
    for (const row of detail.rows) {
      const category = categories.find((item) => item.id === row.category_id);
      const key = category?.id ?? "none";
      const current = map.get(key) ?? {
        name: category?.name ?? "Sem categoria",
        color: category?.color,
        icon: category?.icon,
        total: 0,
      };
      current.total += Number(row.amount);
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [detail, categories]);

  const maxTotal = byCategory[0]?.total ?? 0;

  return (
    <Dialog open={Boolean(detail)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        {detail ? (
          <>
            <DialogHeader>
              <DialogTitle>{detail.label}</DialogTitle>
              <DialogDescription>{detail.formula}</DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
              <p className="text-3xl font-bold tabular-nums">{detail.value}</p>
              {detail.totalInvoiced && detail.totalInvoiced !== detail.value && (
                <p className="mt-1 text-sm font-medium text-primary">
                  Total no período: {detail.totalInvoiced}
                </p>
              )}
              {detail.hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{detail.hint}</p>
              ) : null}
            </div>


            {detail.extra && detail.extra.length > 0 ? (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {detail.extra.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-2.5">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {byCategory.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Divisão por categoria
                </h3>
                <ul className="mt-2 space-y-2">
                  {byCategory.map((item) => {
                    const Icon = categoryIcon(item.icon);
                    const percent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                    return (
                      <li key={item.name} className="text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0" style={{ color: item.color ?? undefined }} />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(percent, 3)}%`,
                              backgroundColor: item.color ?? "var(--primary)",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lançamentos ({detail.rows.length})
              </h3>
              {detail.rows.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhum lançamento compõe este valor.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {detail.rows
                    .slice()
                    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
                    .slice(0, 40)
                    .map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-2 p-2.5 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{row.description}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(`${row.transaction_date}T12:00:00`)}
                            {row.payment_method ? ` · ${row.payment_method}` : ""}
                          </span>
                        </span>
                        <span
                          className={
                            row.transaction_type === "income"
                              ? "shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                              : "shrink-0 font-semibold tabular-nums"
                          }
                        >
                          {formatCurrency(Number(row.amount))}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              {detail.rows.length > 40 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Mostrando os 40 lançamentos mais recentes.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
