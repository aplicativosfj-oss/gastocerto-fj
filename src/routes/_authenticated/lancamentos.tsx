import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileDown,
  Filter,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { FilterField, FilterPanel } from "@/components/finance/filter-panel";
import { FilterPresets } from "@/components/finance/filter-presets";
import { MetaChip, PageHeader } from "@/components/finance/page-header";
import { StatTile } from "@/components/finance/stat-tile";
import { PeriodPicker } from "@/components/finance/period-picker";
import { InlineNotes } from "@/components/finance/inline-notes";
import { TransactionDetailsDialog } from "@/components/finance/transaction-details-dialog";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { PastMonthsLockNotice } from "@/components/finance/past-months-lock-notice";
import { PasswordConfirmDialog } from "@/components/finance/password-confirm-dialog";
import { usePastEditUnlock } from "@/lib/past-edit-unlock";
import { useClosingPolicy } from "@/lib/use-closing-policy";
import { ExpenseCardsDialog } from "@/components/finance/expense-cards-dialog";
import { cn } from "@/lib/utils";


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { PdfExportSettingsDialog } from "@/components/finance/pdf-export-settings-dialog";
import { ShareLinkDialog } from "@/components/finance/share-link-dialog";
import { exportTransactionPdf } from "@/lib/transaction-detail-export";
import { fetchNoteHistory } from "@/lib/transaction-notes";

import { PAYMENT_METHODS, TRANSACTION_STATUS, labelFor, monthRange, periodDefaultDate } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import { useVehicles } from "@/lib/vehicles";
import {
  useDeleteTransaction,
  useSaveTransaction,
  useTransactions,
  type Transaction,
} from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  head: () => ({
    meta: [
      { title: "Transações — GastoCerto" },
      { name: "description", content: "Pesquise, filtre e gerencie todos os seus lançamentos." },
      { property: "og:title", content: "Transações — GastoCerto" },
      {
        property: "og:description",
        content: "Pesquise, filtre e gerencie todos os seus lançamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): {
    veiculo?: string;
    ano?: number;
    mes?: number;
    tipo?: "all" | "expense" | "income";
  } => ({
    veiculo: typeof search["veiculo"] === "string" ? (search["veiculo"] as string) : undefined,
    ano: Number(search["ano"]) || undefined,
    mes: Number(search["mes"]) || undefined,
    tipo:
      search["tipo"] === "income" || search["tipo"] === "expense" || search["tipo"] === "all"
        ? (search["tipo"] as "income" | "expense" | "all")
        : undefined,
  }),
  component: TransactionsPage,
});

const PAGE_SIZE = 15;

/** Recortes da tela: despesas e receitas ganham espaços próprios. */
const VIEWS = [
  {
    key: "expense",
    tab: "Despesas",
    title: "Despesas",
    newLabel: "Nova despesa",
    icon: TrendingDown,
    description: "Somente saídas do período: filtre, audite e corrija cada gasto.",
  },
  {
    key: "income",
    tab: "Receitas",
    title: "Receitas",
    newLabel: "Nova receita",
    icon: TrendingUp,
    description: "Somente entradas do período, com status de recebimento.",
  },
  {
    key: "all",
    tab: "Tudo",
    title: "Extrato completo",
    newLabel: "Novo lançamento",
    icon: ArrowLeftRight,
    description: "Entradas e saídas juntas, em ordem cronológica.",
  },
] as const;

function TransactionsPage() {
  const today = new Date();
  const search_ = Route.useSearch();
  const [period, setPeriod] = useState({
    year: search_.ano ?? today.getFullYear(),
    month: search_.mes ?? today.getMonth() + 1,
  });
  const [vehicleFilter, setVehicleFilter] = useState(search_.veiculo ?? "all");
  const { data: vehicles } = useVehicles(true);
  const range = monthRange(period.year, period.month);
  const { data: transactions, isLoading } = useTransactions(range);
  const { data: categories } = useCategories();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();

  const [search, setSearch] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string>(search_.tipo ?? "expense");
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [details, setDetails] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  /** Cadeado de competências passadas: libera com a senha do próprio usuário. */
  const monthKeyView = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const isPastPeriod = monthKeyView < currentMonthKey;
  const { policy } = useClosingPolicy();
  const pastUnlock = usePastEditUnlock(monthKeyView);
  const adminBlockedPast = isPastPeriod && policy.lockPastMonths;
  const pastLocked =
    isPastPeriod &&
    (policy.lockPastMonths || (policy.requirePasswordForPastEdits && !pastUnlock.unlocked));
  const [askPassword, setAskPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const view = VIEWS.find((item) => item.key === typeFilter) ?? VIEWS[2];

  /** Executa a ação somente quando a competência estiver liberada. */
  function guardPast(action: () => void, label?: string) {
    if (!pastLocked) {
      action();
      return;
    }
    if (adminBlockedPast) {
      toast.error("Mês bloqueado pelo administrador", {
        description:
          policy.notice || "Solicite a liberação em Fechamento mensal para retificar este mês.",
      });
      return;
    }
    setPendingAction(() => action);
    setPendingLabel(label ?? "Editar lançamentos deste mês");
    setAskPassword(true);
  }



  const categoryNames = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const merchantTerm = merchantFilter.trim().toLowerCase();
    let rows = (transactions ?? []).filter((row) => {
      // A busca cobre descrição, estabelecimento e palavras-chave das anotações.
      if (
        term &&
        !`${row.description} ${row.merchant_name ?? ""} ${row.notes ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (merchantTerm && !(row.merchant_name ?? "").toLowerCase().includes(merchantTerm))
        return false;
      if (fromDate && row.transaction_date < fromDate) return false;
      if (toDate && row.transaction_date > toDate) return false;
      if (categoryFilter !== "all" && row.category_id !== categoryFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (typeFilter !== "all" && row.transaction_type !== typeFilter) return false;
      if (vehicleFilter !== "all" && row.vehicle_id !== vehicleFilter) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "date_asc") return a.transaction_date.localeCompare(b.transaction_date);
      if (sort === "amount_desc") return Number(b.amount) - Number(a.amount);
      if (sort === "amount_asc") return Number(a.amount) - Number(b.amount);
      return b.transaction_date.localeCompare(a.transaction_date);
    });

    return rows;
  }, [
    transactions,
    search,
    merchantFilter,
    fromDate,
    toDate,
    categoryFilter,
    statusFilter,
    typeFilter,
    vehicleFilter,
    sort,
  ]);

  // Qualquer mudança de filtro volta para a primeira página da lista.
  useEffect(() => {
    setPage(1);
  }, [
    categoryFilter,
    statusFilter,
    typeFilter,
    vehicleFilter,
    merchantFilter,
    fromDate,
    toDate,
    sort,
    period.year,
    period.month,
  ]);


  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const total = filtered.reduce(
    (sum, row) => sum + (row.transaction_type === "income" ? Number(row.amount) : -Number(row.amount)),
    0,
  );

  /** Totais por natureza para os cartões de resumo do período filtrado. */
  const periodTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let open = 0;
    let openCount = 0;
    for (const row of filtered) {
      const value = Number(row.amount || 0);
      if (row.transaction_type === "income") {
        income += value;
        incomeCount += 1;
      } else {
        expense += value;
        expenseCount += 1;
      }
      if (row.status === "pending" || row.status === "overdue") {
        open += value;
        openCount += 1;
      }
    }
    return { income, expense, incomeCount, expenseCount, open, openCount };
  }, [filtered]);



  /** Exporta o PDF do lançamento direto da lista, sem abrir o diálogo. */
  async function handleRowPdf(row: Transaction) {
    try {
      const history = await fetchNoteHistory(row.id);
      await exportTransactionPdf(row, {
        categoryName: row.category_id ? categoryNames.get(row.category_id) : undefined,
        history,
      });
      toast.success("PDF gerado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF");
    }
  }

  async function handleDuplicate(row: Transaction) {

    try {
      await save.mutateAsync({
        values: {
          description: `${row.description} (cópia)`,
          amount: row.amount,
          transaction_type: row.transaction_type,
          category_id: row.category_id,
          account_id: row.account_id,
          transaction_date: row.transaction_date,
          payment_method: row.payment_method,
          expense_type: row.expense_type,
          merchant_name: row.merchant_name,
          notes: row.notes,
          tags: row.tags,
          is_essential: row.is_essential,
          status: row.status,
        },
      });
      toast.success("Lançamento duplicado.");
    } catch (error) {
      console.error("[lancamentos] falha ao duplicar", error);
      toast.error("Não foi possível duplicar.");
    }
  }

  async function handleDelete(ids: string[]) {
    try {
      await remove.mutateAsync(ids);
      setSelected([]);
      setConfirmDelete(null);
      toast.success(ids.length > 1 ? "Lançamentos excluídos." : "Lançamento excluído.");
    } catch (error) {
      console.error("[lancamentos] falha ao excluir", error);
      toast.error("Não foi possível excluir.");
    }
  }

  function exportCsv() {
    const header = ["Data", "Descrição", "Categoria", "Pagamento", "Status", "Tipo", "Valor"];
    const lines = filtered.map((row) =>
      [
        row.transaction_date,
        row.description,
        row.category_id ? (categoryNames.get(row.category_id) ?? "") : "",
        labelFor(PAYMENT_METHODS, row.payment_method),
        labelFor(TRANSACTION_STATUS, row.status),
        row.transaction_type === "income" ? "Receita" : "Despesa",
        String(row.amount),
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos-${period.year}-${String(period.month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const activeFilters = [
    search.trim() !== "",
    merchantFilter.trim() !== "",
    fromDate !== "",
    toDate !== "",
    categoryFilter !== "all",
    statusFilter !== "all",
    vehicleFilter !== "all",
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setMerchantFilter("");
    setFromDate("");
    setToDate("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setVehicleFilter("all");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4">
        <PageHeader
          icon={view.icon}
          eyebrow="Lançamentos"
          title={view.title}
          description={view.description}
          meta={
            <div className="flex flex-wrap items-center gap-1.5">
              <MetaChip icon={Receipt}>{filtered.length} itens</MetaChip>
              <MetaChip icon={Wallet} tone={total >= 0 ? "success" : "destructive"}>
                Saldo {formatCurrency(total)}
              </MetaChip>
              {activeFilters ? (
                <MetaChip icon={Filter} tone="brand">
                  {activeFilters} filtros
                </MetaChip>
              ) : null}
            </div>
          }
          actions={
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                size="sm"
                className="h-9 px-3"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" />
                {view.newLabel}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-3"
                onClick={() => setCardsOpen(true)}
              >
                <Zap className="mr-1.5 size-4" aria-hidden />
                Gasto rápido
              </Button>
            </div>
          }
        />

        {/* Barra de contexto: recorte (despesas/receitas), competência e exportações. */}
        <section className="rounded-2xl border border-border bg-card p-2.5 shadow-soft sm:p-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              aria-label="Recorte dos lançamentos"
              className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1"
            >
              {VIEWS.map((item) => {
                const active = typeFilter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTypeFilter(item.key)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold tracking-tight transition-all duration-200",
                      active
                        ? "bg-card text-foreground shadow-soft ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-3.5" aria-hidden />
                    {item.tab}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
              <PeriodPicker year={period.year} month={period.month} onChange={setPeriod} />
              <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-border lg:block" />
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3"
                onClick={exportCsv}
                disabled={filtered.length === 0}
              >
                <Download className="mr-1.5 size-4" />
                CSV
              </Button>
              <PdfExportSettingsDialog />
              <ShareLinkDialog year={period.year} month={period.month} />
            </div>
          </div>
        </section>

        <PastMonthsLockNotice monthKey={monthKeyView} />

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
          <StatTile
            label="Receitas"
            value={formatCurrency(periodTotals.income)}
            tone="success"
            icon={TrendingUp}
            hint={
              <span className="flex items-center gap-1 font-medium text-success/80">
                <Plus className="size-3" />
                {periodTotals.incomeCount} lançamentos
              </span>
            }
            className="sm:p-3.5"
          />
          <StatTile
            label="Despesas"
            value={formatCurrency(periodTotals.expense)}
            tone="expense"
            icon={TrendingDown}
            hint={
              <span className="flex items-center gap-1 font-medium text-destructive/80">
                <TrendingDown className="size-3" />
                {periodTotals.expenseCount} lançamentos
              </span>
            }
            className="sm:p-3.5"
            progress={
              periodTotals.income ? (periodTotals.expense / periodTotals.income) * 100 : undefined
            }
          />
          <StatTile
            label="Balanço"
            value={formatCurrency(total)}
            tone={total >= 0 ? "brand" : "warning"}
            icon={Wallet}
            hint={
              <span className="font-medium opacity-80">
                {total >= 0 ? "Resultado positivo" : "Resultado negativo"}
              </span>
            }
            className="sm:p-3.5"
          />
          <StatTile
            label="Pendentes"
            value={formatCurrency(periodTotals.open)}
            tone={periodTotals.openCount ? "warning" : "neutral"}
            icon={Clock}
            hint={
              <span className="flex items-center gap-1 font-medium">
                <Clock className="size-3" />
                {periodTotals.openCount} aguardando
              </span>
            }
            className="sm:p-3.5"
          />
        </div>

        {/* Presets e "meus filtros": recortes prontos sem abrir o formulário. */}
        <FilterPresets
          scope="lancamentos"
          values={{
            search,
            merchant: merchantFilter,
            from: fromDate,
            to: toDate,
            category: categoryFilter,
            status: statusFilter,
            type: typeFilter,
            vehicle: vehicleFilter,
            sort,
          }}
          onApply={(patch) => {
            if (patch.search !== undefined) setSearch(patch.search);
            if (patch.merchant !== undefined) setMerchantFilter(patch.merchant);
            if (patch.from !== undefined) setFromDate(patch.from);
            if (patch.to !== undefined) setToDate(patch.to);
            if (patch.category !== undefined) setCategoryFilter(patch.category);
            if (patch.status !== undefined) setStatusFilter(patch.status);
            if (patch.type !== undefined) setTypeFilter(patch.type);
            if (patch.vehicle !== undefined) setVehicleFilter(patch.vehicle);
            if (patch.sort !== undefined) setSort(patch.sort);
            setPage(1);
          }}
          onClear={clearFilters}
        />


        <FilterPanel
          description="Busca, categoria, status, período e veículo"
          activeCount={activeFilters}
          onClear={clearFilters}
        >
          <FilterField label="Pesquisar" htmlFor="filtro-busca">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filtro-busca"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Descrição, anotação…"
                className="pl-9"
              />
            </div>
          </FilterField>

          <FilterField label="Categoria">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger aria-label="Filtrar por categoria">
                <SelectValue placeholder="Filtrar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {(categories ?? [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {TRANSACTION_STATUS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Ordenar">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger aria-label="Ordenar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Mais recentes</SelectItem>
                <SelectItem value="date_asc">Mais antigos</SelectItem>
                <SelectItem value="amount_desc">Maior valor</SelectItem>
                <SelectItem value="amount_asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Veículo">
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger aria-label="Filtrar por veículo">
                <SelectValue placeholder="Veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {(vehicles ?? []).map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Estabelecimento" htmlFor="filtro-estabelecimento">
            <Input
              id="filtro-estabelecimento"
              value={merchantFilter}
              onChange={(event) => setMerchantFilter(event.target.value)}
              placeholder="Ex.: Posto Central"
            />
          </FilterField>

          <div className="grid grid-cols-2 gap-2.5">
            <FilterField label="De" htmlFor="filtro-de">
              <Input
                id="filtro-de"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </FilterField>
            <FilterField label="Até" htmlFor="filtro-ate">
              <Input
                id="filtro-ate"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </FilterField>
          </div>
        </FilterPanel>



        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <span>{selected.length} selecionado(s)</span>
            <Button variant="destructive" size="sm" onClick={() => guardPast(() => setConfirmDelete(selected), `Excluir ${selected.length} lançamentos selecionados`)}>
              <Trash2 className="mr-2 size-4" />
              Excluir selecionados
            </Button>
          </div>
        ) : null}

        {/* Mobile: cartões densos, com cor por natureza e ações essenciais. */}
        <section className="space-y-2 sm:hidden" aria-label="Lançamentos do período">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                <Search className="size-6" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">Nenhum lançamento encontrado.</p>
              <Button
                variant="outline"
                className="mt-4"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Novo lançamento
              </Button>
            </div>
          ) : (
            rows.map((row) => {
              const income = row.transaction_type === "income";
              return (
                <article
                  key={row.id}
                  className="interactive-card relative overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all active:scale-[0.98]"
                >
                  <div className="flex items-stretch">
                    <span
                      aria-hidden="true"
                      className={income ? "w-1.5 shrink-0 bg-success/80" : "w-1.5 shrink-0 bg-destructive/80"}
                    />
                    <div className="min-w-0 flex-1 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setDetails(row)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[14px] font-bold tracking-tight text-foreground">
                                {row.description}
                              </span>
                              {row.is_recurring && (
                                <Zap className="size-3 shrink-0 text-brand" fill="currentColor" />
                              )}
                            {row.attachment_url ? (
                              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                            ) : null}
                            {pastLocked ? (
                              <Lock
                                className="size-3.5 shrink-0 text-amber-600"
                                aria-label="Mês anterior bloqueado"
                              />
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                            <span>{formatDate(row.transaction_date)}</span>
                            {row.category_id && (
                              <>
                                <span>•</span>
                                <span className="truncate">{categoryNames.get(row.category_id)}</span>
                              </>
                            )}
                          </div>
                        </button>
                        <div className="text-right">
                          <p className={cn(
                            "font-display text-[16px] font-bold tabular tracking-tight",
                            income ? "text-success" : "text-destructive"
                          )}>
                            {income ? "+" : "−"}
                            {formatCurrency(Number(row.amount))}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={row.status === "overdue" ? "destructive" : row.status === "pending" ? "secondary" : "outline"}
                            className="h-5 px-2 text-[9px] font-bold uppercase tracking-wider rounded-md"
                          >
                            {labelFor(TRANSACTION_STATUS, row.status)}
                          </Badge>
                          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {labelFor(PAYMENT_METHODS, row.payment_method)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted"
                            onClick={() =>
                              guardPast(() => {
                                setEditing(row);
                                setDialogOpen(true);
                              }, `Editar "${row.description}"`)
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted"
                            onClick={() => guardPast(() => setConfirmDelete([row.id]), `Excluir "${row.description}"`)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:block">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground/40">
                <Search className="size-8" />
              </div>
              <p className="mt-5 text-base font-semibold">Nenhum lançamento para exibir</p>
              <p className="text-sm text-muted-foreground">Ajuste os filtros ou adicione uma nova transação.</p>
              <Button
                className="mt-6"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Novo lançamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/20 border-b border-border/50">
                <TableRow className="hover:bg-transparent h-10">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      aria-label="Selecionar tudo"
                      checked={rows.every((row) => selected.includes(row.id))}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? rows.map((row) => row.id) : [])
                      }
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Data</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Lançamento</TableHead>
                  <TableHead className="hidden font-bold text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden font-bold text-[10px] uppercase tracking-wider text-muted-foreground lg:table-cell">Pagamento</TableHead>
                  <TableHead className="hidden font-bold text-[10px] uppercase tracking-wider text-muted-foreground sm:table-cell text-center">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Valor</TableHead>
                  <TableHead className="w-20 text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className="group h-[52px] cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button") || target.closest('[role="checkbox"]')) return;
                        setDetails(row);
                      }}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          aria-label={`Selecionar ${row.description}`}
                          checked={selected.includes(row.id)}
                          onCheckedChange={(checked) =>
                            setSelected((current) =>
                              checked
                                ? [...current, row.id]
                                : current.filter((id) => id !== row.id),
                            )
                          }
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-[13px] text-muted-foreground">
                        {formatDate(row.transaction_date)}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all"
                            onClick={() =>
                              setExpanded((current) =>
                                current.includes(row.id)
                                  ? current.filter((id) => id !== row.id)
                                  : [...current, row.id],
                              )
                            }
                          >
                            {expanded.includes(row.id) ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-[14px] font-bold tracking-tight hover:text-brand transition-colors"
                            onClick={() => setDetails(row)}
                          >
                            <span className="truncate">{row.description}</span>
                            {row.is_recurring && (
                              <Zap className="size-3.5 shrink-0 text-brand" fill="currentColor" />
                            )}
                            {row.attachment_url ? (
                              <Paperclip className="size-3.5 shrink-0 text-muted-foreground/60" />
                            ) : null}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-[13px] text-muted-foreground font-medium">
                        {row.category_id ? (categoryNames.get(row.category_id) ?? "—") : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="inline-flex rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {labelFor(PAYMENT_METHODS, row.payment_method)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge
                          variant={row.status === "overdue" ? "destructive" : row.status === "pending" ? "secondary" : "outline"}
                          className="h-5 px-2 text-[9px] font-bold uppercase tracking-wide rounded-md"
                        >
                          {labelFor(TRANSACTION_STATUS, row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-display text-[15px] font-bold tabular-nums tracking-tight",
                          row.transaction_type === "income" ? "text-success" : "text-foreground"
                        )}
                      >
                        {row.transaction_type === "income" ? "+" : "−"}
                        {formatCurrency(Number(row.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                            onClick={() =>
                              guardPast(() => {
                                setEditing(row);
                                setDialogOpen(true);
                              }, `Editar "${row.description}"`)
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                            onClick={() => guardPast(() => handleDuplicate(row), `Duplicar "${row.description}"`)}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                            onClick={() => handleRowPdf(row)}
                          >
                            <FileDown className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                            onClick={() => guardPast(() => setConfirmDelete([row.id]), `Excluir "${row.description}"`)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded.includes(row.id) && (
                      <TableRow className="bg-muted/5 hover:bg-muted/5">
                        <TableCell colSpan={8} className="py-0 px-0">
                          <div className="border-t border-border/50 p-4">
                            <InlineNotes transaction={row} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}

              </TableBody>
            </Table>
          )}
        </section>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {currentPage} de {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Próxima
            </Button>
          </div>
        ) : null}
      </div>

      <ExpenseCardsDialog
        open={cardsOpen}
        onOpenChange={setCardsOpen}
        onAdvanced={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />

      <PasswordConfirmDialog
        open={askPassword}
        onOpenChange={(next) => {
          setAskPassword(next);
          if (!next) {
            setPendingAction(null);
            setPendingLabel(null);
          }
        }}
        lockedMonths={[monthKeyView]}
        actionLabel={pendingLabel}
        onConfirmed={() => {
          pastUnlock.grant();
          const action = pendingAction;
          setPendingAction(null);
          action?.();
        }}
      />

      {dialogOpen ? (
        <TransactionDialog

          key={editing?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          kind={editing?.transaction_type === "income" ? "income" : "expense"}
          transaction={editing}
          defaultDate={periodDefaultDate(period.year, period.month)}
          onSaved={(savedDate) => {
            const [y, m] = savedDate.split("-").map(Number);
            if (y && m && (y !== period.year || m !== period.month)) setPeriod({ year: y, month: m });
          }}
        />

      ) : null}

      <TransactionDetailsDialog
        transaction={details}
        open={details !== null}
        onOpenChange={(value) => !value && setDetails(null)}
        onEdit={(row) => {
          setEditing(row);
          setDialogOpen(true);
        }}
      />



      <AlertDialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro do seu histórico e atualiza métricas e orçamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
