import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarRange,
  Download,
  FileText,
  ListFilter,
  PieChart as PieChartIcon,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { FeatureGate } from "@/components/finance/feature-gate";
import { FilterField, FilterPanel } from "@/components/finance/filter-panel";
import { MetaChip, PageHeader } from "@/components/finance/page-header";
import { Panel } from "@/components/finance/panel";
import { StatTile } from "@/components/finance/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CHART_TOKENS,
  axisProps,
  barRadius,
  gridProps,
  legendProps,
  seriesColor,
  tooltipProps,
} from "@/lib/chart-theme";
import { isoDate, labelFor, MONTH_NAMES, PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useTransactions } from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios avançados — GastoCerto" },
      {
        name: "description",
        content: "Analise despesas, receitas e categorias por período e exporte em CSV ou PDF.",
      },
      { property: "og:title", content: "Relatórios avançados — GastoCerto" },
      {
        property: "og:description",
        content: "Analise despesas, receitas e categorias por período e exporte em CSV ou PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { start: isoDate(start), end: isoDate(now) };
}

function ReportsPage() {
  const initial = useMemo(defaultRange, []);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recipientFilter, setRecipientFilter] = useState("all");

  const [methodFilter, setMethodFilter] = useState("all");
  const [essentialFilter, setEssentialFilter] = useState("all");

  const { data: transactions, isLoading } = useTransactions({ start, end });
  const { data: categories } = useCategories();

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) map.set(category.id, category.name);
    return map;
  }, [categories]);

  const rows = useMemo(() => {
    return (transactions ?? []).filter((item) => {
      if (typeFilter !== "all" && item.transaction_type !== typeFilter) return false;
      if (categoryFilter !== "all" && item.category_id !== categoryFilter) return false;
      if (methodFilter !== "all" && item.payment_method !== methodFilter) return false;
      if (essentialFilter === "essential" && !item.is_essential) return false;
      if (essentialFilter === "non_essential" && item.is_essential) return false;
      
      if (recipientFilter !== "all") {
        const hasTag = (item.tags ?? []).some(t => t.toLowerCase().includes(recipientFilter.toLowerCase()));
        const hasNotes = (item.notes ?? "").toLowerCase().includes(recipientFilter.toLowerCase());
        const hasMerchant = (item.merchant_name ?? "").toLowerCase().includes(recipientFilter.toLowerCase());
        if (!hasTag && !hasNotes && !hasMerchant) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, methodFilter, essentialFilter, recipientFilter]);


  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      const value = Number(row.amount || 0);
      if (row.transaction_type === "income") income += value;
      else if (row.transaction_type === "expense") expense += value;
    }
    return {
      income,
      expense,
      balance: income - expense,
      count: rows.length,
      average: rows.length ? expense / Math.max(1, monthsBetween(start, end)) : 0,
    };
  }, [rows, start, end]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (typeFilter !== "all" && row.transaction_type !== typeFilter) continue;
      if (typeFilter === "all" && row.transaction_type !== "expense") continue; // Default pie to expenses if all
      const key = row.category_id ? (categoryName.get(row.category_id) ?? "Sem categoria") : "Sem categoria";
      map.set(key, (map.get(key) ?? 0) + Number(row.amount || 0));
    }
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows, categoryName]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; receitas: number; despesas: number }>();
    for (const row of rows) {
      const key = row.transaction_date.slice(0, 7);
      const entry = map.get(key) ?? {
        month: `${MONTH_NAMES[Number(key.slice(5, 7)) - 1].slice(0, 3)}/${key.slice(2, 4)}`,
        receitas: 0,
        despesas: 0,
      };
      const value = Number(row.amount || 0);
      if (row.transaction_type === "income") entry.receitas += value;
      else if (row.transaction_type === "expense") entry.despesas += value;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [rows]);

  function exportCsv() {
    const header = [
      "Data",
      "Descrição",
      "Tipo",
      "Categoria",
      "Forma de pagamento",
      "Essencial",
      "Status",
      "Valor",
    ];
    const lines = rows.map((row) => [
      formatDate(`${row.transaction_date}T00:00:00`),
      row.description,
      row.transaction_type === "income" ? "Receita" : "Despesa",
      row.category_id ? (categoryName.get(row.category_id) ?? "") : "",
      labelFor(PAYMENT_METHODS, row.payment_method),
      row.is_essential ? "Sim" : "Não",
      row.status,
      String(Number(row.amount || 0).toFixed(2)).replace(".", ","),
    ]);

    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const namePart = recipientFilter !== 'all' ? `destinatario-${recipientFilter}` : categoryFilter !== 'all' ? categoryName.get(categoryFilter) : 'geral';
    const filename = `relatorio-${namePart}-${start}-a-${end}.csv`;

    downloadBlob(`\uFEFF${csv}`, "text/csv;charset=utf-8;", filename);

    toast.success("CSV exportado");
  }

  async function exportPdf() {
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
      doc.setFontSize(16);
      doc.text("GastoCerto — Relatório financeiro", 40, 40);
      doc.setFontSize(10);
      doc.text(
        `Período: ${formatDate(`${start}T00:00:00`)} a ${formatDate(`${end}T00:00:00`)}`,
        40,
        58,
      );
      doc.text(
        `Receitas: ${formatCurrency(totals.income)}   Despesas: ${formatCurrency(
          totals.expense,
        )}   Saldo: ${formatCurrency(totals.balance)}   Lançamentos: ${totals.count}`,
        40,
        74,
      );

      autoTable(doc, {
        startY: 92,
        head: [["Categoria", "Total", "% das despesas"]],
        body: byCategory.map((item) => [
          item.name,
          formatCurrency(item.value),
          formatPercent(totals.expense ? (item.value / totals.expense) * 100 : 0, 1),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 185, 129] },
      });

      const afterCategories = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY;

      autoTable(doc, {
        startY: afterCategories + 20,
        head: [["Data", "Descrição", "Tipo", "Categoria", "Pagamento", "Valor"]],
        body: rows
          .slice(0, 400)
          .map((row) => [
            formatDate(`${row.transaction_date}T00:00:00`),
            row.description,
            row.transaction_type === "income" ? "Receita" : "Despesa",
            row.category_id ? (categoryName.get(row.category_id) ?? "—") : "—",
            labelFor(PAYMENT_METHODS, row.payment_method),
            formatCurrency(Number(row.amount || 0)),
          ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
      });

      const namePart = recipientFilter !== 'all' ? `destinatario-${recipientFilter}` : categoryFilter !== 'all' ? categoryName.get(categoryFilter) : 'geral';
      const filename = `relatorio-${namePart}-${start}-a-${end}.pdf`;

      doc.save(filename);

      toast.success("PDF gerado");
    } catch (error) {
      console.error("[relatorios] falha ao gerar PDF", error);
      toast.error("Não foi possível gerar o PDF");
    }
  }

  const activeFilters = [
    typeFilter !== "all",
    categoryFilter !== "all",
    recipientFilter !== "all",
    methodFilter !== "all",
    essentialFilter !== "all",
  ].filter(Boolean).length;

  function clearFilters() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setRecipientFilter("all");
    setMethodFilter("all");
    setEssentialFilter("all");
  }

  const savingRate = totals.income ? (totals.balance / totals.income) * 100 : 0;
  const topCategory = byCategory[0];

  return (
    <AppShell>
      <FeatureGate feature="reports_advanced">
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          icon={BarChart3}
          eyebrow="Análise financeira"
          title="Relatórios e Filtros"
          description="Compare receitas e despesas do período, veja o peso de cada categoria e exporte o resultado."
          meta={
            <>
              <MetaChip icon={CalendarRange}>
                {formatDate(`${start}T00:00:00`)} — {formatDate(`${end}T00:00:00`)}
              </MetaChip>
              <MetaChip icon={ListFilter} tone={activeFilters ? "brand" : "neutral"}>
                {activeFilters ? `${activeFilters} filtro(s)` : "Sem filtros"}
              </MetaChip>
              <MetaChip icon={Receipt}>{totals.count} lançamento(s)</MetaChip>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="mr-2 size-4" />
                CSV
              </Button>
              <Button onClick={exportPdf} disabled={rows.length === 0}>
                <FileText className="mr-2 size-4" />
                PDF
              </Button>
            </>
          }
        />

        <FilterPanel
          description="Ajuste período, tipo, categoria e forma de pagamento"
          activeCount={activeFilters}
          onClear={clearFilters}
        >
          <FilterField label="De" htmlFor="report-start">
            <Input
              id="report-start"
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </FilterField>
          <FilterField label="Até" htmlFor="report-end">
            <Input
              id="report-end"
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </FilterField>
          <FilterField label="Tipo">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="expense">Saídas (gastos)</SelectItem>
                <SelectItem value="income">Entradas (recebimentos)</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Categoria">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(categories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Destinatário">
            <Select value={recipientFilter} onValueChange={setRecipientFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os destinatários</SelectItem>
                <SelectItem value="esposa">Esposa</SelectItem>
                <SelectItem value="marido">Marido</SelectItem>
                <SelectItem value="mãe">Mãe</SelectItem>
                <SelectItem value="pai">Pai</SelectItem>
                <SelectItem value="filho">Filhos</SelectItem>
                <SelectItem value="tio">Tio / Tia</SelectItem>
                <SelectItem value="amigo">Amigo / Outros</SelectItem>
                <SelectItem value="presente">Presentes</SelectItem>
                <SelectItem value="cabelo">Cabelo / Beleza</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Pagamento">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Essencialidade">
            <Select value={essentialFilter} onValueChange={setEssentialFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="essential">Essenciais</SelectItem>
                <SelectItem value="non_essential">Não essenciais</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FilterPanel>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Receitas"
            value={formatCurrency(totals.income)}
            tone="success"
            icon={TrendingUp}
            hint="Entradas confirmadas"
            className="sm:p-3.5"
          />
          <StatTile
            label="Despesas"
            value={formatCurrency(totals.expense)}
            tone="expense"
            icon={TrendingDown}
            hint={
              totals.income
                ? `${formatPercent((totals.expense / totals.income) * 100, 1)} da renda`
                : "Saídas totais"
            }
            progress={totals.income ? (totals.expense / totals.income) * 100 : undefined}
            className="sm:p-3.5"
          />
          <StatTile
            label="Saldo"
            value={formatCurrency(totals.balance)}
            tone={totals.balance >= 0 ? "brand" : "warning"}
            icon={Wallet}
            hint={
              totals.income
                ? `Sobra de ${formatPercent(savingRate, 1)}`
                : "Diferença do período"
            }
            className="sm:p-3.5"
          />
          <StatTile
            label="Média Mensal"
            value={formatCurrency(totals.average)}
            tone="neutral"
            icon={CalendarRange}
            hint={`${monthsBetween(start, end)} meses analisados`}
            className="sm:p-3.5"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-72 rounded-2xl" />
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <Panel
              title="Receitas x despesas por mês"
              description="Evolução mensal do período filtrado"
              icon={BarChart3}
              className="interactive-card shadow-soft"
              bodyClassName="p-2 sm:p-4"
            >
              <div className="h-60 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" {...axisProps} />
                    <YAxis {...axisProps} width={70} />
                    <Tooltip {...tooltipProps} formatter={(value: number) => formatCurrency(value)} />
                    <Legend {...legendProps} />
                    <Bar dataKey="receitas" name="Receitas" fill={CHART_TOKENS.income} radius={barRadius} />
                    <Bar dataKey="despesas" name="Despesas" fill={CHART_TOKENS.expense} radius={barRadius} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title={`Distribuição por categoria (${typeFilter === "income" ? "Receitas" : "Despesas"})`}
              description={
                topCategory
                  ? `Maior peso: ${topCategory.name} · ${formatPercent(
                      totals.expense ? (topCategory.value / totals.expense) * 100 : 0,
                      1,
                    )}`
                  : "Sem dados no período"
              }
              icon={PieChartIcon}
              className="interactive-card shadow-soft"
              bodyClassName="p-2 sm:p-4"
            >
              <div className="h-60 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory.slice(0, 8)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {byCategory.slice(0, 8).map((entry, index) => (
                        <Cell key={entry.name} fill={seriesColor(index)} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipProps} formatter={(value: number) => formatCurrency(value)} />
                    <Legend {...legendProps} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}

        <Panel
          title="Detalhamento por categoria"
          description="Participação de cada categoria no total de despesas"
          icon={ListFilter}
          className="interactive-card shadow-soft"
          bodyClassName="p-0"
        >
          {byCategory.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento no período com os filtros escolhidos.
            </p>
          ) : (
            <>
              {/* Mobile: lista com barra de proporção */}
              <ul className="divide-y divide-border sm:hidden">
                {byCategory.map((item, index) => {
                  const share = totals.expense ? (item.value / totals.expense) * 100 : 0;
                  return (
                    <li key={item.name} className="px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: seriesColor(index) }}
                          />
                          <span className="truncate text-[13px] font-medium">{item.name}</span>
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold tabular">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, share)}%`, background: seriesColor(index) }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-muted-foreground tabular">
                          {formatPercent(share, 1)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[38%]">% das despesas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCategory.map((item, index) => {
                      const share = totals.expense ? (item.value / totals.expense) * 100 : 0;
                      return (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ background: seriesColor(index) }}
                              />
                              {item.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular">
                            {formatCurrency(item.value)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, share)}%`,
                                    background: seriesColor(index),
                                  }}
                                />
                              </div>
                              <span className="w-14 shrink-0 text-right text-xs font-semibold tabular">
                                {formatPercent(share, 1)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Panel>
      </div>
    </FeatureGate>
    </AppShell>
  );
}


function monthsBetween(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  return Math.max(1, months);
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
