import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronRight, History, NotebookPen, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryIcon } from "@/lib/category-icons";
import { PAYMENT_METHODS, TRANSACTION_STATUS, EXPENSE_TYPES, labelFor } from "@/lib/finance";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { NOTE_FIELD_LABEL, useNoteHistory } from "@/lib/transaction-notes";
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

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function fullDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return formatDate(date);
  return WEEKDAY_FORMAT.format(parsed);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium">{value}</p>
    </div>
  );
}

/** Painel expandido com informações completas do lançamento selecionado. */
function TransactionPanel({
  transaction,
  categoryName,
  onEdit,
}: {
  transaction: Transaction;
  categoryName?: string;
  onEdit?: (transaction: Transaction) => void;
}) {
  const { data: history } = useNoteHistory(transaction.id, true);
  const isIncome = transaction.transaction_type === "income";

  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{transaction.description}</p>
          <p className="flex items-center gap-1.5 text-[11px] capitalize text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            {fullDate(transaction.transaction_date)}
            {transaction.transaction_time ? ` · ${transaction.transaction_time.slice(0, 5)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={transaction.status === "overdue" ? "destructive" : "secondary"}>
            {labelFor(TRANSACTION_STATUS, transaction.status)}
          </Badge>
          <span
            className={`text-lg font-semibold tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : ""}`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(Number(transaction.amount))}
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <Field label="Categoria" value={categoryName ?? "Sem categoria"} />
        <Field label="Pagamento" value={labelFor(PAYMENT_METHODS, transaction.payment_method)} />
        {!isIncome ? (
          <Field label="Tipo de gasto" value={labelFor(EXPENSE_TYPES, transaction.expense_type)} />
        ) : null}
        {transaction.merchant_name ? (
          <Field label="Estabelecimento" value={transaction.merchant_name} />
        ) : null}
        {transaction.due_date ? (
          <Field label="Vencimento" value={formatDate(transaction.due_date)} />
        ) : null}
        {transaction.payment_date ? (
          <Field label="Pago em" value={formatDate(transaction.payment_date)} />
        ) : null}
        {transaction.total_installments ? (
          <Field
            label="Parcela"
            value={`${transaction.installment_number ?? 1} de ${transaction.total_installments}`}
          />
        ) : null}
      </div>

      <div className="mt-2 rounded-md border border-border/60 bg-background/60 p-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <NotebookPen className="size-3.5" /> Observações
        </p>
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
          {transaction.notes || "Nenhuma anotação registrada."}
        </p>
      </div>

      <div className="mt-2 rounded-md border border-border/60 bg-background/60 p-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <History className="size-3.5" /> Histórico de alterações ({history?.length ?? 0})
        </p>
        {(history ?? []).length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">Nenhuma alteração registrada.</p>
        ) : (
          <ul className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto">
            {(history ?? []).map((entry) => (
              <li key={entry.id} className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatDateTime(entry.changed_at)} ·{" "}
                  {NOTE_FIELD_LABEL[entry.field] ?? entry.field}
                </p>
                <p className="mt-0.5 line-through text-muted-foreground">
                  {entry.old_value || "(vazio)"}
                </p>
                <p className="font-medium">{entry.new_value || "(vazio)"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onEdit ? (
        <Button size="sm" className="mt-3 w-full sm:w-auto" onClick={() => onEdit(transaction)}>
          <Pencil className="mr-2 size-3.5" /> Editar este lançamento
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Detalhamento visual de um card do painel: como o número é calculado,
 * a divisão por categoria e a lista dos lançamentos que o compõem.
 * Navegável por teclado (setas, Enter/Espaço, Esc para fechar).
 */
export function MetricDetailDialog({
  detail,
  categories,
  onOpenChange,
  onEditTransaction,
}: {
  detail: MetricDetail | null;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
  /** Abre a tela de edição com os campos já preenchidos. */
  onEditTransaction?: (transaction: Transaction) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [detail]);

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

  const rows = useMemo(
    () =>
      (detail?.rows ?? [])
        .slice()
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
        .slice(0, 40),
    [detail],
  );

  function moveFocus(delta: number, currentIndex: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-row-button]");
    if (!buttons?.length) return;
    const next = Math.min(Math.max(currentIndex + delta, 0), buttons.length - 1);
    buttons[next]?.focus();
  }

  return (
    <Dialog open={Boolean(detail)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] gap-3 overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        {detail ? (
          <>
            <DialogHeader className="text-left">
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
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
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
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {byCategory.map((item) => {
                    const Icon = categoryIcon(item.icon);
                    const percent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                    const categorySum = byCategory.reduce((sum, entry) => sum + entry.total, 0);
                    const share = categorySum > 0 ? Math.round((item.total / categorySum) * 100) : 0;
                    return (
                      <li key={item.name} className="text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0" style={{ color: item.color ?? undefined }} />
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                            <span className="font-semibold">{formatCurrency(item.total)}</span>
                            <span className="text-[10px] text-muted-foreground">{share}%</span>
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
              <p className="mt-1 text-[11px] text-muted-foreground">
                Use Tab e as setas ↑ ↓ para percorrer, Enter para ver os detalhes e Esc para fechar.
              </p>
              {rows.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhum lançamento compõe este valor.
                </p>
              ) : (
                <ul
                  ref={listRef}
                  className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border"
                >
                  {rows.map((row, index) => {
                    const expanded = selectedId === row.id;
                    const category = categories.find((item) => item.id === row.category_id);
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          data-row-button
                          aria-expanded={expanded}
                          className="flex w-full items-center justify-between gap-2 p-2.5 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedId(expanded ? null : row.id)}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              moveFocus(1, index);
                            } else if (event.key === "ArrowUp") {
                              event.preventDefault();
                              moveFocus(-1, index);
                            } else if (event.key === "Home") {
                              event.preventDefault();
                              moveFocus(-rows.length, index);
                            } else if (event.key === "End") {
                              event.preventDefault();
                              moveFocus(rows.length, index);
                            }
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{row.description}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(`${row.transaction_date}T12:00:00`)}
                              {row.payment_method
                                ? ` · ${labelFor(PAYMENT_METHODS, row.payment_method)}`
                                : ""}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span
                              className={
                                row.transaction_type === "income"
                                  ? "font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                                  : "font-semibold tabular-nums"
                              }
                            >
                              {formatCurrency(Number(row.amount))}
                            </span>
                            <ChevronRight
                              className={`size-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                            />
                          </span>
                        </button>
                        {expanded ? (
                          <div className="px-2.5 pb-2.5">
                            <TransactionPanel
                              transaction={row}
                              categoryName={category?.name}
                              onEdit={onEditTransaction}
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
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
