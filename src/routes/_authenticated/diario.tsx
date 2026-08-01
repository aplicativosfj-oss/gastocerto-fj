import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { TransactionDetailsDialog } from "@/components/finance/transaction-details-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useTransactions, type Transaction } from "@/lib/transactions";


export const Route = createFileRoute("/_authenticated/diario")({
  head: () => ({
    meta: [
      { title: "Gastos do dia — GastoCerto" },
      {
        name: "description",
        content:
          "Veja em detalhes os gastos de hoje com hora do lançamento, além dos totais quinzenais e mensais.",
      },
      { property: "og:title", content: "Gastos do dia — GastoCerto" },
      {
        property: "og:description",
        content: "Detalhe hora a hora dos seus gastos diários, quinzenais e mensais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DailyPage,
});

type Mode = "dia" | "quinzena" | "mes";

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(mode: Mode) {
  const today = new Date();
  if (mode === "dia") return { start: iso(today), end: iso(today) };
  if (mode === "quinzena") {
    const first = today.getDate() <= 15;
    const start = new Date(today.getFullYear(), today.getMonth(), first ? 1 : 16);
    const end = first
      ? new Date(today.getFullYear(), today.getMonth(), 15)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: iso(start), end: iso(end) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: iso(start), end: iso(end) };
}

function hourOf(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function DailyPage() {
  const [mode, setMode] = useState<Mode>("dia");
  const [dialogOpen, setDialogOpen] = useState(false);
  const range = useMemo(() => rangeFor(mode), [mode]);
  const { data: allTransactions, isLoading } = useTransactions(range);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"date" | "category">("date");
  const [details, setDetails] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const { data: categories } = useCategories();


  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    (categories ?? []).forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const term = search.trim().toLowerCase();
  const transactions = useMemo(
    () =>
      (allTransactions ?? []).filter((item) => {
        if (categoryFilter !== "all") {
          const matches =
            item.category_id === categoryFilter || item.sub_category_id === categoryFilter;
          if (!matches) return false;
        }
        if (!term) return true;
        return (
          item.description.toLowerCase().includes(term) ||
          (item.merchant_name ?? "").toLowerCase().includes(term) ||
          (item.notes ?? "").toLowerCase().includes(term)
        );
      }),
    [allTransactions, categoryFilter, term],
  );

  const expenses = (transactions ?? []).filter((item) => item.transaction_type === "expense");
  const incomes = (transactions ?? []).filter((item) => item.transaction_type === "income");
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);

  /** Agrupa por dia (quinzena/mês) ou por hora (dia atual) para o gráfico. */
  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    expenses.forEach((item) => {
      const key =
        mode === "dia"
          ? (hourOf(item.created_at) ?? "—").slice(0, 2) + "h"
          : formatDate(item.transaction_date).slice(0, 5);
      buckets.set(key, (buckets.get(key) ?? 0) + Number(item.amount));
    });
    return [...buckets.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [expenses, mode]);

  /** Lista agrupada por data, como um extrato bancário. */
  const groups = useMemo(() => {
    const map = new Map<string, typeof expenses>();
    (transactions ?? []).forEach((item) => {
      const list = map.get(item.transaction_date) ?? [];
      list.push(item);
      map.set(item.transaction_date, list);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  /** Totais por categoria, para o modo de agrupamento por categoria. */
  const categoryGroups = useMemo(() => {
    const map = new Map<string, { total: number; count: number; items: typeof expenses }>();
    (transactions ?? []).forEach((item) => {
      const key = item.category_id ?? "none";
      const entry = map.get(key) ?? { total: 0, count: 0, items: [] };
      entry.total += (item.transaction_type === "income" ? 1 : -1) * Number(item.amount);
      entry.count += 1;
      entry.items.push(item);
      map.set(key, entry);
    });
    return [...map.entries()].sort((a, b) => a[1].total - b[1].total);
  }, [transactions]);

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gastos em detalhes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(range.start)} até {formatDate(range.end)} · hora de cada lançamento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList>
                <TabsTrigger value="dia">Hoje</TabsTrigger>
                <TabsTrigger value="quinzena">Quinzena</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Novo gasto
            </Button>
          </div>
        </header>

        <section className="auto-cards-sm">
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Saídas no período</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">
              {formatCurrency(totalExpense)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{expenses.length} lançamento(s)</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Entradas no período</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
              {formatCurrency(totalIncome)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{incomes.length} lançamento(s)</p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Resultado</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                totalIncome - totalExpense >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {formatCurrency(totalIncome - totalExpense)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Entradas menos saídas</p>
          </article>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-muted-foreground" />
            {mode === "dia" ? "Saídas por hora" : "Saídas por dia"}
          </h2>
          <div className="chart-frame mt-2">
            {chartData.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">
                Sem gastos registrados neste período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} width={54} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <h2 className="text-sm font-semibold">Extrato detalhado</h2>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar lançamento"
                  aria-label="Buscar lançamento no extrato"
                  className="h-9 w-44 ps-8 text-xs"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-44 text-xs" aria-label="Filtrar por categoria">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={groupBy} onValueChange={(value) => setGroupBy(value as typeof groupBy)}>
                <TabsList>
                  <TabsTrigger value="date">Por data</TabsTrigger>
                  <TabsTrigger value="category">Por categoria</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum lançamento neste período. Use “Novo gasto” para registrar agora.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(groupBy === "category"
                ? categoryGroups.map(
                    ([key, entry]) =>
                      [
                        key === "none" ? "Sem categoria" : (categoryName.get(key) ?? "Sem categoria"),
                        entry.items,
                      ] as const,
                  )
                : groups
              ).map(([date, items]) => (
                <li key={date}>
                  <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {groupBy === "category" ? date : formatDate(date)}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {formatCurrency(
                        items.reduce(
                          (sum, item) =>
                            sum +
                            (item.transaction_type === "income" ? 1 : -1) * Number(item.amount),
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {items.map((item) => {
                      const income = item.transaction_type === "income";
                      const time = hourOf(item.created_at);
                      return (
                        <li
                          key={item.id}
                          className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-muted/50"
                          onClick={() => setDetails(item)}
                        >

                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={`grid size-8 shrink-0 place-items-center rounded-full ${
                                income ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {income ? (
                                <ArrowUpRight className="size-4" />
                              ) : (
                                <ArrowDownRight className="size-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.description}</p>
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {time ? (
                                  <>
                                    <Clock className="size-3" />
                                    {time}
                                  </>
                                ) : null}
                                {item.category_id ? (
                                  <span className="truncate">
                                    · {categoryName.get(item.category_id) ?? "Sem categoria"}
                                    {item.sub_category_id
                                      ? ` › ${categoryName.get(item.sub_category_id) ?? ""}`
                                      : ""}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {item.is_essential ? (
                              <Badge variant="secondary" className="hidden sm:inline-flex">
                                Essencial
                              </Badge>
                            ) : null}
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                income ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {income ? "+" : "−"}
                              {formatCurrency(Number(item.amount))}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {dialogOpen || editing ? (
        <TransactionDialog
          open={dialogOpen || Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) {
              setDialogOpen(false);
              setEditing(null);
            }
          }}
          transaction={editing}
          kind={editing?.transaction_type ?? "expense"}
        />
      ) : null}

      <TransactionDetailsDialog
        transaction={details}
        open={Boolean(details)}
        onOpenChange={(open) => !open && setDetails(null)}
        onEdit={(row) => {
          setDetails(null);
          setEditing(row);
        }}
      />
    </AppShell>

  );
}
