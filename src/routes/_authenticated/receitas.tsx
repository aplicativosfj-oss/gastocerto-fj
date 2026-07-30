import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PeriodPicker } from "@/components/finance/period-picker";
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
import { monthRange } from "@/lib/finance";
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
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
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
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

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
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Receitas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entradas do mês e quanto sobra depois das despesas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card label="Total recebido" value={formatCurrency(totalIncome)} />
          <Card label="Total gasto" value={formatCurrency(totalExpense)} />
          <Card
            label="Sobra do mês"
            value={formatCurrency(totalIncome - totalExpense)}
            hint={`Taxa de economia: ${savingRate.toFixed(1)}%`}
          />
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
