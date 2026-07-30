import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Check, Pencil, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [confirm, setConfirm] = useState<RecurringRule | null>(null);

  const categoryNames = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const today = isoDate(new Date());
  const upcoming = useMemo(
    () =>
      (generated ?? [])
        .slice()
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
    [generated],
  );

  const pendingTotal = upcoming
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
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Contas recorrentes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
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
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Nova recorrência
            </Button>
          </div>
        </header>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card">
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
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((rule) => (
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
                        aria-label={`Ativar ${rule.description}`}
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
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Próximos vencimentos</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Lançamentos gerados automaticamente. Marque como pago quando quitar a conta.
            </p>
          </div>
          {upcoming.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento gerado ainda. Use “Gerar próximos”.
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
          key={editing?.id ?? "new-rule"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rule={editing}
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
