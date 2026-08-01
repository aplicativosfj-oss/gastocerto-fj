import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  Check,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { RecurringDialog } from "@/components/finance/recurring-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TRANSACTION_STATUS, isoDate, labelFor } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import {
  FREQUENCIES,
  useDeleteRecurringRule,
  useGenerateRecurring,
  useRecurringRules,
  useRecurringTransactions,
  useSaveRecurringRule,
  useSettleTransaction,
  useSyncRecurringStatus,
  useToggleRecurringRule,
  type RecurringRule,
} from "@/lib/recurring";

export const Route = createFileRoute("/_authenticated/recorrencia")({
  head: () => ({
    meta: [
      { title: "Contas recorrentes — GastoCerto" },
      {
        name: "description",
        content: "Cadastre contas fixas e gere automaticamente os próximos vencimentos.",
      },
      { property: "og:title", content: "Contas recorrentes — GastoCerto" },
      {
        property: "og:description",
        content: "Cadastre contas fixas e gere automaticamente os próximos vencimentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecurringPage,
});

function RecurringPage() {
  const { data: rules, isLoading } = useRecurringRules();
  const { data: generated } = useRecurringTransactions();
  const { data: categories } = useCategories();
  const generate = useGenerateRecurring();
  const toggle = useToggleRecurringRule();
  const remove = useDeleteRecurringRule();
  const settle = useSettleTransaction();
  const save = useSaveRecurringRule();
  const syncStatus = useSyncRecurringStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [preset, setPreset] = useState<{
    type?: "expense" | "income";
    frequency?: string;
  } | null>(null);

  const [confirm, setConfirm] = useState<RecurringRule | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [freqFilter, setFreqFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due-asc");

  const categoryNames = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const today = isoDate(new Date());

  const visibleRules = useMemo(
    () =>
      (rules ?? []).filter((rule) => {
        if (freqFilter !== "all" && rule.frequency !== freqFilter) return false;
        if (activeFilter === "active" && !rule.active) return false;
        if (activeFilter === "paused" && rule.active) return false;
        return true;
      }),
    [rules, freqFilter, activeFilter],
  );

  async function duplicateRule(rule: RecurringRule) {
    try {
      await save.mutateAsync({
        values: {
          description: `${rule.description} (cópia)`,
          amount: rule.amount,
          transaction_type: rule.transaction_type,
          category_id: rule.category_id,
          account_id: rule.account_id,
          payment_method: rule.payment_method,
          frequency: rule.frequency,
          day_of_month: rule.day_of_month,
          start_date: rule.start_date,
          end_date: rule.end_date,
          is_essential: rule.is_essential,
          notes: rule.notes,
          active: false,
        },
      });
      toast.success("Modelo duplicado — ative quando quiser usar.");
    } catch (error) {
      console.error("[recorrentes] falha ao duplicar", error);
      toast.error("Não foi possível duplicar o modelo.");
    }
  }

  // Sincroniza uma vez por visita: pendentes vencidos viram atrasados.
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current || !generated) return;
    synced.current = true;
    syncStatus.mutate(undefined, {
      onError: (error) => console.error("[recorrentes] falha ao sincronizar status", error),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated]);

  const rows = useMemo(() => (generated ?? []).slice(), [generated]);

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0 };
    for (const row of rows) {
      if (row.status === "paid" || row.status === "received") base.paid += 1;
      else if (row.due_date && row.due_date < today) base.overdue += 1;
      else base.pending += 1;
    }
    return base;
  }, [rows, today]);

  const upcoming = useMemo(() => {
    const filtered = rows.filter((row) => {
      const paid = row.status === "paid" || row.status === "received";
      const overdue = !paid && row.due_date != null && row.due_date < today;
      if (statusFilter === "all") return true;
      if (statusFilter === "paid") return paid;
      if (statusFilter === "overdue") return overdue;
      if (statusFilter === "pending") return !paid && !overdue;
      return !paid; // "open" = pendentes + atrasados
    });

    return filtered.sort((a, b) => {
      if (sortBy === "due-desc") return (b.due_date ?? "").localeCompare(a.due_date ?? "");
      if (sortBy === "amount-desc") return Number(b.amount) - Number(a.amount);
      if (sortBy === "amount-asc") return Number(a.amount) - Number(b.amount);
      return (a.due_date ?? "").localeCompare(b.due_date ?? "");
    });
  }, [rows, statusFilter, sortBy, today]);

  const pendingTotal = rows
    .filter((row) => row.status !== "paid" && row.status !== "received")
    .reduce((sum, row) => sum + Number(row.amount), 0);


  async function handleGenerate() {
    try {
      const result = await generate.mutateAsync(rules ?? []);
      toast.success(
        result.created > 0
          ? `${result.created} lançamento(s) gerado(s).`
          : "Tudo em dia — nenhum lançamento novo era necessário.",
      );
    } catch (error) {
      console.error("[recorrentes] falha ao gerar", error);
      toast.error("Não foi possível gerar os lançamentos.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="page-title">Contas recorrentes</h1>
            <p className="page-subtitle mt-1">
              {formatCurrency(pendingTotal)} em vencimentos ainda não pagos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleGenerate} disabled={generate.isPending}>
              <RefreshCw
                className={`mr-2 size-4 ${generate.isPending ? "animate-spin" : ""}`}
              />
              Gerar próximos
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setPreset({ type: "income", frequency: "monthly" });
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Receita mensal
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setPreset({ type: "expense", frequency: "monthly" });
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Financiamento/Parcela
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setPreset(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Nova recorrência
            </Button>

          </div>

        </header>

        <section className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-income-border bg-income-surface p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-income">Receitas</p>
            <p className="mt-0.5 text-sm font-bold text-income">
              {formatCurrency(rows.filter(r => r.transaction_type === "income").reduce((s, r) => s + Number(r.amount), 0))}
            </p>
          </div>
          <div className="flex flex-col rounded-2xl border border-expense-border bg-expense-surface p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-expense">Despesas</p>
            <p className="mt-0.5 text-sm font-bold text-expense">
              {formatCurrency(rows.filter(r => r.transaction_type === "expense").reduce((s, r) => s + Number(r.amount), 0))}
            </p>
          </div>
          <div className="flex flex-col rounded-2xl border border-brand/20 bg-brand/5 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Pendente</p>
            <p className="mt-0.5 text-sm font-bold text-expense">{formatCurrency(pendingTotal)}</p>
          </div>
        </section>


        <section className={cn("rounded-2xl border border-border bg-card transition-all duration-300", isLoading && "opacity-50 blur-[1px]")}>
          {(rules ?? []).length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <Select value={freqFilter} onValueChange={setFreqFilter}>
                <SelectTrigger className="w-[170px]" aria-label="Filtrar por frequência">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as frequências</SelectItem>
                  {FREQUENCIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-[150px]" aria-label="Filtrar por situação">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ativas e pausadas</SelectItem>
                  <SelectItem value="active">Somente ativas</SelectItem>
                  <SelectItem value="paused">Somente pausadas</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {visibleRules.length} modelo(s) neste filtro
              </span>
            </div>
          ) : null}
          <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (rules ?? []).length === 0 ? (
            <div className="p-10 text-center">
              <CalendarClock className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Cadastre aluguel, internet, mensalidades e assinaturas para nunca mais esquecer um
                vencimento.
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Criar recorrência
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden sm:table-cell">Frequência</TableHead>
                  <TableHead className="hidden lg:table-cell">Dia</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24 text-center">Ativa</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.description}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {rule.category_id ? (categoryNames.get(rule.category_id) ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {labelFor(FREQUENCIES, rule.frequency)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums">
                      {rule.day_of_month ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(Number(rule.amount))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        aria-label={`${rule.active ? "Pausar" : "Ativar"} ${rule.description}`}
                        checked={rule.active}
                        onCheckedChange={(checked) =>
                          toggle.mutate({ id: rule.id, active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar recorrência"
                          onClick={() => {
                            setEditing(rule);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Duplicar ${rule.description}`}
                          disabled={save.isPending}
                          onClick={() => duplicateRule(rule)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir recorrência"
                          onClick={() => setConfirm(rule)}
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
          </div>
        </section>

        <section className={cn("rounded-2xl border border-border bg-card transition-all duration-300", (isLoading || generate.isPending) && "opacity-50 blur-[1px]")}>
          <div className="border-b border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold">Próximos vencimentos</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {counts.overdue} atrasado(s) · {counts.pending} pendente(s) · {counts.paid}{" "}
                  pago(s). O status é atualizado automaticamente.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[170px]" aria-label="Filtrar por status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Em aberto</SelectItem>
                    <SelectItem value="overdue">Atrasados</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[190px]" aria-label="Ordenar">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due-asc">Vencimento (mais próximo)</SelectItem>
                    <SelectItem value="due-desc">Vencimento (mais distante)</SelectItem>
                    <SelectItem value="amount-desc">Maior valor</SelectItem>
                    <SelectItem value="amount-asc">Menor valor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento neste filtro. Use “Gerar próximos” ou troque o status.
            </p>

          ) : (
            <ul className="divide-y divide-border">
              {upcoming.slice(0, 30).map((row) => {
                const paid = row.status === "paid" || row.status === "received";
                const overdue = !paid && row.due_date != null && row.due_date < today;
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Vence em {row.due_date ? formatDate(row.due_date) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={overdue ? "destructive" : paid ? "outline" : "secondary"}>
                        {overdue ? "Atrasado" : labelFor(TRANSACTION_STATUS, row.status)}
                      </Badge>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(Number(row.amount))}
                      </span>
                      <Button
                        variant={paid ? "ghost" : "outline"}
                        size="sm"
                        onClick={() =>
                          settle.mutate({ id: row.id, status: paid ? "pending" : "paid" })
                        }
                      >
                        {paid ? (
                          <>
                            <Undo2 className="mr-2 size-4" /> Reabrir
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 size-4" /> Pagar
                          </>
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {dialogOpen ? (
        <RecurringDialog
          key={editing?.id ?? `new-${preset?.type ?? "expense"}-${preset?.frequency ?? "monthly"}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rule={editing}
          preset={preset}
        />
      ) : null}


      <AlertDialog open={confirm !== null} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos já gerados continuam no histórico; apenas novas gerações são
              interrompidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirm) return;
                await remove.mutateAsync(confirm.id).catch(() => {
                  toast.error("Não foi possível excluir.");
                });
                setConfirm(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
