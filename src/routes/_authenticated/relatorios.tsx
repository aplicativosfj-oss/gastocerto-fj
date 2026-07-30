import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
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
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, methodFilter, essentialFilter]);

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
      if (row.transaction_type !== "expense") continue;
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

    downloadBlob(`\uFEFF${csv}`, "text/csv;charset=utf-8;", `relatorio-${start}-a-${end}.csv`);
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

      doc.save(`relatorio-${start}-a-${end}.pdf`);
      toast.success("PDF gerado");
    } catch (error) {
      console.error("[relatorios] falha ao gerar PDF", error);
      toast.error("Não foi possível gerar o PDF");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Filtre por período, categoria e forma de pagamento e exporte os resultados.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="mr-2 size-4" />
              CSV
            </Button>
            <Button onClick={exportPdf} disabled={rows.length === 0}>
              <FileText className="mr-2 size-4" />
              PDF
            </Button>
          </div>
        </header>

        <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <Label htmlFor="report-start">De</Label>
            <Input
              id="report-start"
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="report-end">Até</Label>
            <Input
              id="report-end"
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="mt-1.5">
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
          </div>
          <div>
            <Label>Pagamento</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="mt-1.5">
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
          </div>
          <div>
            <Label>Essencialidade</Label>
            <Select value={essentialFilter} onValueChange={setEssentialFilter}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="essential">Essenciais</SelectItem>
                <SelectItem value="non_essential">Não essenciais</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Receitas" value={formatCurrency(totals.income)} />
          <MetricCard label="Despesas" value={formatCurrency(totals.expense)} />
          <MetricCard label="Saldo" value={formatCurrency(totals.balance)} />
          <MetricCard label="Média mensal de gastos" value={formatCurrency(totals.average)} />
        </div>

        {isLoading ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-medium">Receitas x despesas por mês</h2>
              <div className="mt-4 h-64">
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
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-medium">Despesas por categoria</h2>
              <div className="mt-4 h-64">
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
            </div>
          </div>
        )}

        <section className="rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-medium">
            Detalhamento por categoria
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">% das despesas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento no período com os filtros escolhidos.
                  </TableCell>
                </TableRow>
              ) : (
                byCategory.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    <TableCell className="text-right">
                      {formatPercent(totals.expense ? (item.value / totals.expense) * 100 : 0, 1)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
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
