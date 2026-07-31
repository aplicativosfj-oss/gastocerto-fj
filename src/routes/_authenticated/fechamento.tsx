import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Lock, RotateCcw, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  BALANCE_START,
  buildBalance,
  useBalanceTransactions,
  useCloseMonth,
  useClosings,
  useReopenMonth,
  monthLabel,
  type MonthBalance,
} from "@/lib/closing";
import { formatCurrency, formatDate } from "@/lib/format";

const TITLE = "Fechamento mensal — GastoCerto";
const DESCRIPTION =
  "Balancete mês a mês: saldo inicial, entradas, saídas e saldo final de cada competência.";

export const Route = createFileRoute("/_authenticated/fechamento")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FechamentoPage,
});

function FechamentoPage() {
  const { data: transactions, isLoading } = useBalanceTransactions();
  const { data: closings } = useClosings();
  const closeMonth = useCloseMonth();
  const reopenMonth = useReopenMonth();

  const [target, setTarget] = useState<MonthBalance | null>(null);
  const [notes, setNotes] = useState("");

  const balance = useMemo(
    () => buildBalance(transactions ?? [], closings ?? []),
    [transactions, closings],
  );

  const totals = useMemo(() => {
    const income = balance.reduce((sum, row) => sum + row.income, 0);
    const expense = balance.reduce((sum, row) => sum + row.expense, 0);
    return { income, expense, result: income - expense, current: balance[0] ?? null };
  }, [balance]);

  async function handleClose() {
    if (!target) return;
    try {
      await closeMonth.mutateAsync({ balance: target, notes });
      toast.success(`Competência ${target.label} fechada.`);
      setTarget(null);
      setNotes("");
    } catch (error) {
      toast.error("Não foi possível fechar o mês.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Fechamento mensal</h1>
          <p className="text-sm text-muted-foreground">
            O balancete começa em {monthLabel(BALANCE_START.year, BALANCE_START.month)} (mês de
            implantação, aceita lançamentos retroativos). A partir do mês seguinte, cada competência
            conta do dia 1º ao último dia do mês, e o saldo final vira o saldo inicial do próximo.
          </p>
        </header>

        <div className="auto-cards-sm grid gap-3">
          <SummaryCard label="Entradas acumuladas" value={totals.income} tone="income" />
          <SummaryCard label="Saídas acumuladas" value={totals.expense} tone="expense" />
          <SummaryCard label="Resultado acumulado" value={totals.result} tone="result" />
          <SummaryCard
            label="Saldo do mês atual"
            value={totals.current?.closing ?? 0}
            tone="result"
          />
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Balancete por competência</h2>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Competência</th>
                    <th className="py-2 pr-3 font-medium">Saldo inicial</th>
                    <th className="py-2 pr-3 font-medium">Entradas</th>
                    <th className="py-2 pr-3 font-medium">Saídas</th>
                    <th className="py-2 pr-3 font-medium">Resultado</th>
                    <th className="py-2 pr-3 font-medium">Saldo final</th>
                    <th className="hidden py-2 pr-3 font-medium sm:table-cell">Lançamentos</th>
                    <th className="py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {balance.map((row) => (
                    <tr key={row.label} className="border-t border-border/70">
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{row.label}</span>
                          {row.isCurrent ? (
                            <Badge variant="secondary" className="text-[10px]">
                              em aberto
                            </Badge>
                          ) : null}
                          {row.isImplantation ? (
                            <Badge variant="outline" className="text-[10px]">
                              implantação
                            </Badge>
                          ) : null}
                          {row.closed ? (
                            <Badge className="text-[10px]">fechado</Badge>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(row.range.start)} a {formatDate(row.range.end)}
                        </p>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatCurrency(row.opening)}</td>
                      <td className="py-2 pr-3 tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.income)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-destructive">
                        {formatCurrency(row.expense)}
                      </td>
                      <td
                        className={`py-2 pr-3 tabular-nums ${
                          row.result < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatCurrency(row.result)}
                      </td>
                      <td className="py-2 pr-3 font-semibold tabular-nums">
                        {formatCurrency(row.closing)}
                      </td>
                      <td className="hidden py-2 pr-3 tabular-nums sm:table-cell">{row.count}</td>
                      <td className="py-2">
                        {row.closed ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={async () => {
                              try {
                                await reopenMonth.mutateAsync(row.closed!.id);
                                toast.success(`Competência ${row.label} reaberta.`);
                              } catch {
                                toast.error("Não foi possível reabrir o mês.");
                              }
                            }}
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Reabrir
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setTarget(row);
                              setNotes("");
                            }}
                          >
                            <Lock className="mr-1.5 size-3.5" />
                            Fechar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={Boolean(target)} onOpenChange={(open) => (open ? null : setTarget(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-4" />
              Fechar {target?.label}
            </DialogTitle>
            <DialogDescription>
              O balancete desta competência será congelado. Você pode reabrir depois se precisar
              ajustar lançamentos.
            </DialogDescription>
          </DialogHeader>

          {target ? (
            <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <Row label="Saldo inicial" value={target.opening} />
              <Row label="Entradas" value={target.income} />
              <Row label="Saídas" value={target.expense} />
              <Row label="Saldo final" value={target.closing} strong />
            </dl>
          ) : null}

          <div>
            <Label htmlFor="closing-notes">Observações (opcional)</Label>
            <Textarea
              id="closing-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={300}
              className="mt-1.5"
              placeholder="Ex.: mês com gasto extra de manutenção do carro."
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleClose} disabled={closeMonth.isPending}>
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{formatCurrency(value)}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "result";
}) {
  const toneClass =
    tone === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "expense"
        ? "text-destructive"
        : value < 0
          ? "text-destructive"
          : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
