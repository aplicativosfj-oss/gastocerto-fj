import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/finance/page-header";
import { PeriodPicker } from "@/components/finance/period-picker";
import { MonthPresets, loadPeriod } from "@/components/finance/month-presets";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { monthRange, periodDefaultDate } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import { useDeleteTransaction, useTransactions, type Transaction } from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/receitas")({
  head: () => ({
    meta: [
      { title: "Receitas — GastoCerto" },
      { name: "description", content: "Registre salários, freelances e outras entradas." },
      { property: "og:title", content: "Receitas — GastoCerto" },
      { property: "og:description", content: "Registre salários, freelances e outras entradas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IncomePage,
});

function IncomePage() {
  const today = new Date();
  const [period, setPeriod] = useState(
    () => loadPeriod("receitas") ?? { year: today.getFullYear(), month: today.getMonth() + 1 },
  );
  const range = monthRange(period.year, period.month);
  const { data: transactions, isLoading } = useTransactions(range);
  const { data: categories } = useCategories();
  const remove = useDeleteTransaction();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const categoryNames = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const incomes = (transactions ?? []).filter((row) => row.transaction_type === "income");
  const expenses = (transactions ?? []).filter((row) => row.transaction_type === "expense");
  const totalIncome = incomes.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpense = expenses.reduce((sum, row) => sum + Number(row.amount), 0);
  const remaining = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const usedRate = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;

  /** Agrupa as entradas por fonte (fonte informada, senão categoria, senão descrição). */
  const sources = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const row of incomes) {
      const label =
        row.merchant_name?.trim() ||
        (row.category_id ? categoryNames.get(row.category_id) : null) ||
        row.description;
      const current = map.get(label) ?? { label, total: 0, count: 0 };
      current.total += Number(row.amount);
      current.count += 1;
      map.set(label, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [incomes, categoryNames]);

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync([id]);
      toast.success("Receita excluída.");
    } catch (error) {
      console.error("[receitas] falha ao excluir", error);
      toast.error("Não foi possível excluir.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          icon={TrendingUp}
          eyebrow="Entradas do mês"
          title="Receitas"
          description="Cadastre e categorize salários, vendas e serviços para relatórios detalhados."
          actions={
            <>
              <PeriodPicker year={period.year} month={period.month} onChange={setPeriod} />
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Nova receita
              </Button>
            </>
          }
        />

        <MonthPresets scope="receitas" value={period} onChange={setPeriod} />


        <section className="auto-cards-sm">
          <Card label="Total recebido" value={formatCurrency(totalIncome)} />
          <Card
            label="Total gasto"
            value={formatCurrency(totalExpense)}
            hint={`${usedRate.toFixed(1)}% da renda do mês`}
          />
          <Card
            label="Ainda sobra"
            value={formatCurrency(remaining)}
            hint={`Taxa de economia: ${savingRate.toFixed(1)}%`}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Uso da renda no mês</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatCurrency(totalExpense)} de {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${remaining < 0 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${usedRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {remaining < 0
              ? `Você gastou ${formatCurrency(Math.abs(remaining))} acima do que recebeu.`
              : `Saldo livre estimado: ${formatCurrency(remaining)}.`}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Fontes de renda</h2>
          {sources.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma fonte registrada. Ao lançar uma receita, informe a fonte (salário, venda,
              serviço) para ver este resumo.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {sources.map((source) => {
                const share = totalIncome > 0 ? (source.total / totalIncome) * 100 : 0;
                return (
                  <li key={source.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">{source.label}</span>
                      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatCurrency(source.total)} · {share.toFixed(0)}%
                        {source.count > 1 ? ` · ${source.count} entradas` : ""}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>


        <section className="overflow-x-auto rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : incomes.length === 0 ? (
            <div className="p-10 text-center">
              <TrendingUp className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma receita registrada neste mês.
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Registrar receita
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(row.transaction_date)}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate font-medium">
                      {row.description}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.category_id ? (categoryNames.get(row.category_id) ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-primary">
                      +{formatCurrency(Number(row.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar receita"
                          onClick={() => {
                            setEditing(row);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir receita"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>

      {dialogOpen ? (
        <TransactionDialog
          key={editing?.id ?? "new-income"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          kind="income"
          transaction={editing}
          defaultDate={periodDefaultDate(period.year, period.month)}
          onSaved={(savedDate) => {
            const [y, m] = savedDate.split("-").map(Number);
            if (y && m && (y !== period.year || m !== period.month)) setPeriod({ year: y, month: m });
          }}
        />

      ) : null}
    </AppShell>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
