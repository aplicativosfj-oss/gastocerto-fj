import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarCheck,
  FileDown,
  FileSpreadsheet,
  Lock,
  PencilLine,
  PieChart as PieIcon,
  RotateCcw,
  ScrollText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { QuickPurchaseDialog } from "@/components/finance/quick-purchase-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { axisProps, seriesColor, tooltipProps } from "@/lib/chart-theme";
import {
  BALANCE_START,
  buildBalance,
  useBalanceTransactions,
  useCloseMonth,
  useClosings,
  monthLabel,
  type MonthBalance,
} from "@/lib/closing";
import {
  REOPEN_STATUS_LABEL,
  isClosingLocked,
  useCreateReopenRequest,
  useMyReopenRequests,
} from "@/lib/closing-lock";
import { exportBalanceCsv, exportBalancePdf } from "@/lib/closing-export";
import { PAYMENT_METHODS, toCents } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useBudgets } from "@/lib/transactions";
import type { Transaction } from "@/lib/transactions";

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
  const requestReopen = useCreateReopenRequest();
  const { data: reopenRequests } = useMyReopenRequests();
  const [reopenTarget, setReopenTarget] = useState<MonthBalance | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  const [target, setTarget] = useState<MonthBalance | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [quickTarget, setQuickTarget] = useState<Transaction | null>(null);
  const { data: categories } = useCategories();

  // Filtros da busca avançada das compras do mês selecionado.
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const balance = useMemo(
    () => buildBalance(transactions ?? [], closings ?? []),
    [transactions, closings],
  );

  const totals = useMemo(() => {
    const income = balance.reduce((sum, row) => sum + row.income, 0);
    const expense = balance.reduce((sum, row) => sum + row.expense, 0);
    return { income, expense, result: income - expense, current: balance[0] ?? null };
  }, [balance]);

  const selected = useMemo(
    () => balance.find((row) => row.label === selectedLabel) ?? balance[0] ?? null,
    [balance, selectedLabel],
  );

  const { data: budgets } = useBudgets(
    selected?.year ?? BALANCE_START.year,
    selected?.month ?? BALANCE_START.month,
  );

  const filtersActive =
    Boolean(search.trim()) ||
    categoryFilter !== "all" ||
    paymentFilter !== "all" ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const detail = useMemo(() => {
    if (!selected) return null;
    const categoryName = new Map((categories ?? []).map((row) => [row.id, row.name]));
    const paymentName = new Map<string, string>(
      PAYMENT_METHODS.map((row) => [row.value as string, row.label]),
    );

    const monthRows = (transactions ?? []).filter(
      (row) =>
        row.transaction_date >= selected.range.start &&
        row.transaction_date <= selected.range.end &&
        row.status !== "canceled" &&
        row.transaction_type === "expense",
    );

    const term = search.trim().toLowerCase();
    const rows = monthRows.filter((row) => {
      if (categoryFilter !== "all") {
        if (categoryFilter === "none" ? row.category_id !== null : row.category_id !== categoryFilter)
          return false;
      }
      if (paymentFilter !== "all") {
        const method = row.payment_method ?? "none";
        if (paymentFilter === "none" ? row.payment_method !== null : method !== paymentFilter)
          return false;
      }
      if (fromDate && row.transaction_date < fromDate) return false;
      if (toDate && row.transaction_date > toDate) return false;
      if (!term) return true;
      return (
        row.description.toLowerCase().includes(term) ||
        (row.merchant_name ?? "").toLowerCase().includes(term) ||
        (row.notes ?? "").toLowerCase().includes(term)
      );
    });

    function group(source: Transaction[], keyOf: (row: Transaction) => string) {
      const map = new Map<string, number>();
      for (const row of source) {
        const key = keyOf(row);
        map.set(key, toCents((map.get(key) ?? 0) + Number(row.amount)));
      }
      return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    // Gasto por categoria (id) sempre do mês inteiro, para comparar com o orçamento.
    const spentByCategoryId = new Map<string, number>();
    for (const row of monthRows) {
      const key = row.category_id ?? "none";
      spentByCategoryId.set(key, toCents((spentByCategoryId.get(key) ?? 0) + Number(row.amount)));
    }

    return {
      rows: rows.slice().sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
      filteredTotal: toCents(rows.reduce((sum, row) => sum + Number(row.amount), 0)),
      monthCount: monthRows.length,
      spentByCategoryId,
      byCategory: group(rows, (row) =>
        row.category_id ? (categoryName.get(row.category_id) ?? "Sem categoria") : "Sem categoria",
      ),
      byPayment: group(rows, (row) =>
        row.payment_method ? (paymentName.get(row.payment_method) ?? row.payment_method) : "Não informado",
      ),
    };
  }, [selected, transactions, categories, search, categoryFilter, paymentFilter, fromDate, toDate]);

  /** Orçamentos da competência selecionada com o gasto real e o nível de alerta. */
  const budgetAlerts = useMemo(() => {
    if (!detail) return [];
    const categoryName = new Map((categories ?? []).map((row) => [row.id, row.name]));
    return (budgets ?? [])
      .map((budget) => {
        const limit = toCents(Number(budget.limit_amount ?? 0));
        const spent = budget.category_id
          ? (detail.spentByCategoryId.get(budget.category_id) ?? 0)
          : toCents(
              [...detail.spentByCategoryId.values()].reduce((sum, value) => sum + value, 0),
            );
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        const threshold = budget.alert_percentage ?? 80;
        return {
          id: budget.id,
          name: budget.category_id
            ? (categoryName.get(budget.category_id) ?? "Categoria")
            : "Orçamento geral do mês",
          limit,
          spent,
          percent,
          threshold,
          level: percent >= 100 ? "over" : percent >= threshold ? "warn" : "ok",
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [budgets, detail, categories]);

  const exceeded = budgetAlerts.filter((item) => item.level !== "ok");

  const budgetProgress = useMemo(() => {
    if (!detail) return [];
    return budgetAlerts.map(b => ({
      ...b,
      remaining: Math.max(0, b.limit - b.spent)
    }));
  }, [budgetAlerts, detail]);


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
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Fechamento mensal</h1>
            <p className="text-sm text-muted-foreground">
              O balancete começa em {monthLabel(BALANCE_START.year, BALANCE_START.month)} (mês de
              implantação, aceita lançamentos retroativos). A partir do mês seguinte, cada
              competência conta do dia 1º ao último dia do mês, e o saldo final vira o saldo inicial
              do próximo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => exportBalanceCsv(balance)}>
              <FileSpreadsheet className="mr-1.5 size-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={async () => {
                try {
                  await exportBalancePdf(balance);
                } catch {
                  toast.error("Não foi possível gerar o PDF.");
                }
              }}
            >
              <FileDown className="mr-1.5 size-4" />
              PDF
            </Button>
          </div>
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
                    <tr
                      key={row.label}
                      onClick={() => setSelectedLabel(row.label)}
                      className={`cursor-pointer border-t border-border/70 transition-colors hover:bg-muted/40 ${
                        selected?.label === row.label ? "bg-muted/50" : ""
                      }`}
                    >
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
                            <Badge
                              variant={isClosingLocked(row.closed) ? "outline" : "secondary"}
                              className="text-[10px]"
                            >
                              {isClosingLocked(row.closed) ? "fechado" : "liberado"}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
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
                          isClosingLocked(row.closed) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReopenTarget(row);
                                setReopenReason("");
                              }}
                            >
                              <RotateCcw className="mr-1.5 size-3.5" />
                              Solicitar liberação
                            </Button>
                          ) : (
                            <Badge variant="secondary">Liberado para edição</Badge>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={(event) => {
                              event.stopPropagation();
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

        {selected && detail ? (
          <section className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                Busca avançada em {selected.label}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  {detail.rows.length} de {detail.monthCount} compras ·{" "}
                  {formatCurrency(detail.filteredTotal)}
                </Badge>
                {filtersActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setPaymentFilter("all");
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-2 grid gap-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Estabelecimento, descrição ou observação"
                  className="pl-8"
                  aria-label="Buscar compras por estabelecimento ou descrição"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger aria-label="Filtrar por categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {(categories ?? [])
                    .filter((category) => category.type === "expense")
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger aria-label="Filtrar por forma de pagamento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as formas</SelectItem>
                  <SelectItem value="none">Não informado</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  min={selected.range.start}
                  max={selected.range.end}
                  onChange={(event) => setFromDate(event.target.value)}
                  aria-label="Data inicial"
                />
                <Input
                  type="date"
                  value={toDate}
                  min={selected.range.start}
                  max={selected.range.end}
                  onChange={(event) => setToDate(event.target.value)}
                  aria-label="Data final"
                />
              </div>
            </div>
          </section>
        ) : null}

        {selected && budgetAlerts.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle
                  className={`size-4 ${exceeded.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}
                />
                Orçamento por categoria — {selected.label}
              </p>
              <Badge variant={exceeded.length > 0 ? "destructive" : "secondary"} className="text-[10px]">
                {exceeded.length > 0
                  ? `${exceeded.length} categoria(s) em alerta`
                  : "tudo dentro do limite"}
              </Badge>
            </div>

            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {budgetProgress.map((item) => (
                <li key={item.id} className="rounded-lg border border-border/70 p-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="tabular-nums">
                      {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(item.percent, 100)} 
                    className="mt-1.5 h-1.5" 
                    indicatorClassName={
                      item.level === "over" ? "bg-destructive" : item.level === "warn" ? "bg-amber-500" : "bg-emerald-500"
                    }
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className={
                      item.level === "over"
                        ? "text-destructive font-medium"
                        : item.level === "warn"
                          ? "text-amber-600 font-medium"
                          : "text-muted-foreground"
                    }>
                      {item.level === "over"
                        ? `Excedeu ${formatCurrency(item.spent - item.limit)}`
                        : item.level === "warn"
                          ? `Atenção: ${item.percent.toFixed(0)}%`
                          : `${item.percent.toFixed(0)}% usado`}
                    </span>
                    {item.remaining > 0 && item.level !== "over" && (
                      <span className="text-muted-foreground">
                        Restam {formatCurrency(item.remaining)}
                      </span>
                    )}
                  </div>
                </li>
              ))}

            </ul>
          </section>
        ) : null}

        {selected && detail ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PieIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Resumo visual de {selected.label}</h2>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                Saídas: {formatCurrency(selected.expense)}
              </Badge>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Gastos por categoria</p>
                <div className="chart-frame mt-1">
                  {detail.byCategory.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={detail.byCategory}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="45%"
                          outerRadius="75%"
                          paddingAngle={2}
                        >
                          {detail.byCategory.map((entry, index) => (
                            <Cell key={entry.name} fill={seriesColor(index)} />
                          ))}
                        </Pie>
                        <Tooltip
                          {...tooltipProps}
                          formatter={(value: number) => formatCurrency(Number(value))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {detail.byCategory.slice(0, 6).map((entry, index) => (
                    <li key={entry.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: seriesColor(index) }}
                        />
                        {entry.name}
                      </span>
                      <span className="tabular-nums">{formatCurrency(entry.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Gastos por forma de pagamento
                </p>
                <div className="chart-frame mt-1">
                  {detail.byPayment.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detail.byPayment} layout="vertical">
                        <XAxis type="number" {...axisProps} hide />
                        <YAxis type="category" dataKey="name" width={92} {...axisProps} />
                        <Tooltip
                          {...tooltipProps}
                          formatter={(value: number) => formatCurrency(Number(value))}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {detail.byPayment.map((entry, index) => (
                            <Cell key={entry.name} fill={seriesColor(index + 2)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Compras do mês — edição rápida de itens, quantidades, peso e pagamento
              </p>
              {detail.rows.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhum gasto lançado nesta competência.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border/70">
                  {detail.rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(row.transaction_date)}
                          {row.merchant_name ? ` · ${row.merchant_name}` : ""}
                          {row.payment_method ? ` · ${row.payment_method}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-destructive">
                          {formatCurrency(Number(row.amount))}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => setQuickTarget(row)}
                        >
                          <PencilLine className="mr-1.5 size-3.5" />
                          Editar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
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
      <QuickPurchaseDialog
        transaction={quickTarget}
        open={Boolean(quickTarget)}
        onOpenChange={(open) => (open ? null : setQuickTarget(null))}
      />
    </AppShell>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Sem dados para o período.
    </div>
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
