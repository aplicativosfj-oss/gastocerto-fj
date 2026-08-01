import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PeriodPicker } from "@/components/finance/period-picker";
import { InlineNotes } from "@/components/finance/inline-notes";
import { TransactionDetailsDialog } from "@/components/finance/transaction-details-dialog";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { ExpenseCardsDialog } from "@/components/finance/expense-cards-dialog";


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
  validateSearch: (search: Record<string, unknown>) => ({
    veiculo: typeof search["veiculo"] === "string" ? (search["veiculo"] as string) : undefined,
    ano: Number(search["ano"]) || undefined,
    mes: Number(search["mes"]) || undefined,
  }),
  component: TransactionsPage,
});

const PAGE_SIZE = 15;

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
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [details, setDetails] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);



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

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} lançamento(s) · saldo do filtro {formatCurrency(total)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker year={period.year} month={period.month} onChange={setPeriod} />
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-2 size-4" />
              CSV
            </Button>
            <Button variant="secondary" onClick={() => setCardsOpen(true)}>
              <Zap className="mr-2 size-4" aria-hidden />
              Gasto rápido
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Novo
            </Button>
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 auto-cards-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar"
              aria-label="Pesquisar lançamentos"
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger aria-label="Filtrar por categoria">
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

          <div className="grid grid-cols-2 gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entradas e saídas</SelectItem>
                <SelectItem value="expense">Saídas (gastos)</SelectItem>
                <SelectItem value="income">Entradas (recebimentos)</SelectItem>
              </SelectContent>
            </Select>
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
          </div>

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

          <Input
            value={merchantFilter}
            onChange={(event) => setMerchantFilter(event.target.value)}
            placeholder="Estabelecimento"
            aria-label="Filtrar por estabelecimento"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground" htmlFor="filtro-de">
                De
              </label>
              <Input
                id="filtro-de"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground" htmlFor="filtro-ate">
                Até
              </label>
              <Input
                id="filtro-ate"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>

          {search || merchantFilter || fromDate || toDate ? (
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => {
                setSearch("");
                setMerchantFilter("");
                setFromDate("");
                setToDate("");
              }}
            >
              Limpar busca e datas
            </Button>
          ) : null}
        </section>



        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <span>{selected.length} selecionado(s)</span>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(selected)}>
              <Trash2 className="mr-2 size-4" />
              Excluir selecionados
            </Button>
          </div>
        ) : null}

        <section className="overflow-x-auto rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Adicionar lançamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Selecionar tudo"
                      checked={rows.every((row) => selected.includes(row.id))}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? rows.map((row) => row.id) : [])
                      }
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <>
                  <TableRow key={row.id}>

                    <TableCell>
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
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(row.transaction_date)}
                    </TableCell>
                    <TableCell className="max-w-[220px] font-medium">
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 truncate text-left hover:underline"
                        onClick={() => setDetails(row)}
                      >
                        <span className="truncate">{row.description}</span>
                        {row.attachment_url ? (
                          <Paperclip
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Possui comprovante"
                          />
                        ) : null}
                      </button>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {row.category_id ? (categoryNames.get(row.category_id) ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {labelFor(PAYMENT_METHODS, row.payment_method)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={
                          row.status === "overdue"
                            ? "destructive"
                            : row.status === "pending"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {labelFor(TRANSACTION_STATUS, row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        row.transaction_type === "income"
                          ? "text-right font-semibold tabular-nums text-primary"
                          : "text-right font-semibold tabular-nums"
                      }
                    >
                      {row.transaction_type === "income" ? "+" : "−"}
                      {formatCurrency(Number(row.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
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
                          aria-label="Duplicar"
                          onClick={() => handleDuplicate(row)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          onClick={() => setConfirmDelete([row.id])}
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
