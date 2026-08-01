import { createFileRoute } from "@tanstack/react-router";
import { Loader2, PiggyBank, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/finance/page-header";
import { PeriodPicker } from "@/components/finance/period-picker";
import { MonthPresets, loadPeriod } from "@/components/finance/month-presets";
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
import { formatCurrency } from "@/lib/format";
import { monthRange, parseAmount, toCents } from "@/lib/finance";
import { MoneyInput } from "@/components/ui/money-input";
import { useCategories } from "@/lib/queries";
import { useBudgets, useSaveBudget, useTransactions } from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — GastoCerto" },
      { name: "description", content: "Defina limites mensais e acompanhe o consumo." },
      { property: "og:title", content: "Orçamentos — GastoCerto" },
      { property: "og:description", content: "Defina limites mensais e acompanhe o consumo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const today = new Date();
  const [period, setPeriod] = useState(
    () => loadPeriod("orcamentos") ?? { year: today.getFullYear(), month: today.getMonth() + 1 },
  );
  const range = monthRange(period.year, period.month);
  const { data: budgets, isLoading } = useBudgets(period.year, period.month);
  const { data: transactions } = useTransactions(range);
  const { data: categories } = useCategories();
  const saveBudget = useSaveBudget();

  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("general");
  const [amount, setAmount] = useState("");
  const [alertAt, setAlertAt] = useState("80");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const expenses = (transactions ?? []).filter((row) => row.transaction_type === "expense");
  const totalExpense = expenses.reduce((sum, row) => sum + Number(row.amount), 0);

  const categoryNames = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const rows = useMemo(
    () =>
      (budgets ?? [])
        .map((budget) => {
          const spent = budget.category_id
            ? expenses
                .filter((row) => row.category_id === budget.category_id)
                .reduce((sum, row) => sum + Number(row.amount), 0)
            : totalExpense;
          const limit = Number(budget.limit_amount);
          return {
            id: budget.id,
            name: budget.category_id
              ? (categoryNames.get(budget.category_id) ?? "Categoria")
              : "Orçamento geral",
            limit,
            spent,
            percent: limit > 0 ? (spent / limit) * 100 : 0,
            alertAt: budget.alert_percentage,
          };
        })
        .sort((a, b) => b.percent - a.percent),
    [budgets, expenses, totalExpense, categoryNames],
  );

  async function handleSave() {
    const value = toCents(parseAmount(amount));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor válido maior que zero.");
      return;
    }
    const alertValue = Number(alertAt);
    if (!Number.isFinite(alertValue) || alertValue < 10 || alertValue > 100) {
      setError("O alerta deve ficar entre 10% e 100%.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await saveBudget.mutateAsync({
        year: period.year,
        month: period.month,
        category_id: categoryId === "general" ? null : categoryId,
        limit_amount: value,
        alert_percentage: alertValue,
      });
      setOpen(false);
      setAmount("");
      toast.success("Orçamento salvo.");
    } catch (saveError) {
      console.error("[orcamentos] falha ao salvar", saveError);
      toast.error("Não foi possível salvar o orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          icon={PiggyBank}
          eyebrow="Planejamento mensal"
          title="Orçamentos"
          description="Defina quanto pretende gastar por categoria e acompanhe o consumo em tempo real."
          actions={
            <>
              <PeriodPicker year={period.year} month={period.month} onChange={setPeriod} />
              <Button
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Definir limite
              </Button>
            </>
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <PiggyBank className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Você ainda não definiu limites para este mês.
            </p>
            <Button className="mt-3" size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 size-4" />
              Criar orçamento
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(row.spent)} de {formatCurrency(row.limit)}
                  </span>
                </div>
                <Progress className="mt-3" value={Math.min(100, row.percent)} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.percent.toFixed(0)}% consumido · alerta em {row.alertAt}% ·{" "}
                  {row.limit - row.spent >= 0
                    ? `${formatCurrency(row.limit - row.spent)} disponíveis`
                    : `${formatCurrency(row.spent - row.limit)} acima do limite`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir limite</DialogTitle>
            <DialogDescription>
              Escolha um limite geral do mês ou um limite por categoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-category">Aplicar a</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="budget-category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Orçamento geral do mês</SelectItem>
                  {(categories ?? [])
                    .filter((category) => category.type === "expense")
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="budget-amount">Limite (R$)</Label>
              <MoneyInput
                id="budget-amount"
                value={amount}
                onValueChange={setAmount}
                className="mt-1.5"
                placeholder="1.500,00"
              />
            </div>

            <div>
              <Label htmlFor="budget-alert">Alertar ao atingir (%)</Label>
              <Input
                id="budget-alert"
                inputMode="numeric"
                value={alertAt}
                onChange={(event) => setAlertAt(event.target.value)}
                className="mt-1.5 tabular-nums"
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
