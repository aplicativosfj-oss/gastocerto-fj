import { useMemo, useState } from "react";
import { ArrowLeft, Check, Delete, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { readRecentCategories, rememberCategory } from "@/components/finance/category-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { categoryIcon } from "@/lib/category-icons";
import { isoDate, monthRange, toCents } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { addMonths } from "@/lib/commitment-schedule";
import { useSaveRecurringRule } from "@/lib/recurring";
import { useSaveTransaction, useTransactions, type Category } from "@/lib/transactions";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "back"] as const;

function digitsToCents(digits: string) {
  return Number(digits || "0");
}

type ExpenseKind = "single" | "installments" | "recurring";

const KIND_OPTIONS: Array<{ value: ExpenseKind; label: string; hint: string }> = [
  { value: "single", label: "Pagamento único", hint: "Um lançamento só" },
  { value: "installments", label: "Parcelado / financiamento", hint: "Gera as parcelas" },
  { value: "recurring", label: "Recorrente", hint: "Repete todo mês" },
];

function shiftIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

/**
 * Lançamento rápido em dois toques: escolha o card da categoria e digite o
 * valor. Sem formulário longo — o restante fica no lançamento completo.
 */
export function ExpenseCardsDialog({
  open,
  onOpenChange,
  onAdvanced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvanced?: () => void;
}) {
  const { data: categories } = useCategories();
  const save = useSaveTransaction();
  const saveRecurring = useSaveRecurringRule();

  const today = new Date();
  const currentRange = monthRange(today.getFullYear(), today.getMonth() + 1);
  const { data: monthTransactions } = useTransactions(currentRange);

  const [selected, setSelected] = useState<Category | null>(null);
  const [digits, setDigits] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ExpenseKind>("single");
  const [installmentsTotal, setInstallmentsTotal] = useState("12");
  const [installmentsPaid, setInstallmentsPaid] = useState("0");
  const [firstDue, setFirstDue] = useState(isoDate(new Date()));
  const [endDate, setEndDate] = useState("");

  const expenseCategories = useMemo(() => {
    const all = (categories ?? []).filter(
      (category) => category.type === "expense" && category.active !== false,
    );
    const recent = readRecentCategories();
    const score = (id: string) => {
      const index = recent.indexOf(id);
      return index === -1 ? 999 : index;
    };
    const term = search.trim().toLowerCase();
    return all
      .filter((category) => !term || category.name.toLowerCase().includes(term))
      .sort((a, b) => score(a.id) - score(b.id) || a.name.localeCompare(b.name));
  }, [categories, search]);

  const cents = digitsToCents(digits);

  function reset() {
    setSelected(null);
    setDigits("");
    setNote("");
    setDate(isoDate(new Date()));
    setSearch("");
    setKind("single");
    setInstallmentsTotal("12");
    setInstallmentsPaid("0");
    setFirstDue(isoDate(new Date()));
    setEndDate("");
  }

  function press(key: (typeof KEYS)[number]) {
    if (key === "back") {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    setDigits((current) => (current + key).replace(/^0+/, "").slice(0, 9));
  }

  const total = Number(installmentsTotal) || 0;
  const paidCount = Math.min(Math.max(Number(installmentsPaid) || 0, 0), total);

  /** Parcelas geradas com os dados atuais do formulário. */
  const plan = useMemo(() => {
    if (kind !== "installments" || total <= 0 || cents <= 0) return [];
    const base = Math.round(cents / total);
    return Array.from({ length: total }, (_, index) => ({
      number: index + 1,
      dueDate: addMonths(firstDue, index),
      amount: (index === total - 1 ? cents - base * (total - 1) : base) / 100,
      paid: index + 1 <= paidCount,
    }));
  }, [kind, total, cents, firstDue, paidCount]);

  const computedEnd = plan.length > 0 ? plan[plan.length - 1].dueDate : "";

  /** Prévia do impacto no saldo do mês e do valor que ainda falta. */
  const impact = useMemo(() => {
    const rows = monthTransactions ?? [];
    const income = toCents(
      rows
        .filter((row) => row.transaction_type === "income")
        .reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const expense = toCents(
      rows
        .filter((row) => row.transaction_type === "expense")
        .reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    let newInMonth = 0;
    if (kind === "single") {
      newInMonth = date.startsWith(prefix) ? cents / 100 : 0;
    } else if (kind === "installments") {
      newInMonth = toCents(
        plan.filter((item) => item.dueDate.startsWith(prefix)).reduce((sum, item) => sum + item.amount, 0),
      );
    } else {
      newInMonth = firstDue.startsWith(prefix) ? cents / 100 : 0;
    }

    const remaining =
      kind === "installments"
        ? toCents(plan.filter((item) => !item.paid).reduce((sum, item) => sum + item.amount, 0))
        : kind === "recurring"
          ? cents / 100
          : 0;

    return {
      balanceBefore: toCents(income - expense),
      balanceAfter: toCents(income - expense - newInMonth),
      newInMonth: toCents(newInMonth),
      remaining,
      monthlyValue: kind === "installments" && total > 0 ? toCents(cents / 100 / total) : cents / 100,
    };
  }, [monthTransactions, kind, date, cents, plan, firstDue, total]);

  async function handleSave() {
    if (!selected) return;
    if (cents <= 0) {
      toast.error("Digite o valor do gasto.");
      return;
    }
    const description = note.trim() ? note.trim().slice(0, 140) : selected.name;
    try {
      if (kind === "installments") {
        if (total <= 0) {
          toast.error("Informe a quantidade de parcelas.");
          return;
        }
        for (const item of plan) {
          await save.mutateAsync({
            values: {
              description: `${description} — parcela ${item.number}/${total}`,
              amount: item.amount,
              transaction_type: "expense",
              category_id: selected.id,
              transaction_date: item.dueDate,
              due_date: item.dueDate,
              status: item.paid ? "paid" : "pending",
              payment_date: item.paid ? item.dueDate : null,
              installment_number: item.number,
              total_installments: total,
            },
          });
        }
      } else if (kind === "recurring") {
        await saveRecurring.mutateAsync({
          values: {
            description,
            amount: cents / 100,
            transaction_type: "expense",
            category_id: selected.id,
            frequency: "monthly",
            day_of_month: Number(firstDue.slice(8, 10)),
            start_date: firstDue,
            end_date: endDate || null,
            is_essential: false,
          },
        });
      } else {
        await save.mutateAsync({
          values: {
            description,
            amount: cents / 100,
            transaction_type: "expense",
            category_id: selected.id,
            transaction_date: date,
            status: "paid",
            payment_date: date,
          },
        });
      }
      rememberCategory(selected.id);
      toast.success(
        kind === "installments"
          ? `${total} parcela(s) de ${selected.name} lançada(s).`
          : kind === "recurring"
            ? `Recorrência de ${selected.name} criada.`
            : `${formatCurrency(cents)} em ${selected.name} registrado.`,
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível registrar o gasto.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selected ? `Quanto gastou em ${selected.name}?` : "Registrar gasto"}
          </DialogTitle>
          <DialogDescription>
            {selected
              ? "Digite o valor, confirme a data e salve."
              : "Toque no card do gasto — em dois toques está lançado."}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoria (feira, gás, combustível...)"
              className="h-10"
              aria-label="Buscar categoria"
            />

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {expenseCategories.slice(0, 24).map((category) => {
                const Icon = categoryIcon(category.icon);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelected(category)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="flex size-9 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${category.color ?? "#64748b"}22`,
                        color: category.color ?? undefined,
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {expenseCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma categoria encontrada.</p>
            ) : null}

            {onAdvanced ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  onAdvanced();
                }}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Lançamento completo (conta, parcelas, anexos)
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-center text-3xl font-bold tabular-nums">
              {formatCurrency(cents)}
            </p>

            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="h-12 text-base font-semibold"
                  onClick={() => press(key)}
                  aria-label={key === "back" ? "Apagar último dígito" : `Digitar ${key}`}
                >
                  {key === "back" ? <Delete className="size-4" aria-hidden /> : key}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Hoje", value: isoDate(new Date()) },
                { label: "Ontem", value: shiftIso(1) },
                { label: "Anteontem", value: shiftIso(2) },
              ].map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  size="sm"
                  variant={date === option.value ? "secondary" : "outline"}
                  className={cn("h-8 text-[11px]")}
                  onClick={() => setDate(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-8 w-auto text-xs"
                aria-label="Data do gasto"
              />
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Tipo de gasto
              </Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {KIND_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    className={cn(
                      "rounded-xl border p-2 text-left transition",
                      kind === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span className="block text-[11px] font-semibold leading-tight">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {kind === "installments" ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="qk-total" className="text-[11px] text-muted-foreground">
                    Parcelas
                  </Label>
                  <Input
                    id="qk-total"
                    inputMode="numeric"
                    value={installmentsTotal}
                    onChange={(event) =>
                      setInstallmentsTotal(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    className="mt-1 h-9 tabular-nums"
                  />
                </div>
                <div>
                  <Label htmlFor="qk-paid" className="text-[11px] text-muted-foreground">
                    Já pagas
                  </Label>
                  <Input
                    id="qk-paid"
                    inputMode="numeric"
                    value={installmentsPaid}
                    onChange={(event) =>
                      setInstallmentsPaid(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    className="mt-1 h-9 tabular-nums"
                  />
                </div>
                <div>
                  <Label htmlFor="qk-first" className="text-[11px] text-muted-foreground">
                    1º vencimento
                  </Label>
                  <Input
                    id="qk-first"
                    type="date"
                    value={firstDue}
                    onChange={(event) => setFirstDue(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
            ) : null}

            {kind === "recurring" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="qk-start" className="text-[11px] text-muted-foreground">
                    Início
                  </Label>
                  <Input
                    id="qk-start"
                    type="date"
                    value={firstDue}
                    onChange={(event) => setFirstDue(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="qk-end" className="text-[11px] text-muted-foreground">
                    Fim (opcional)
                  </Label>
                  <Input
                    id="qk-end"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
            ) : null}

            {cents > 0 ? (
              <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Peso neste mês</dt>
                  <dd className="font-semibold tabular-nums text-destructive">
                    {formatCurrency(impact.newInMonth)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Saldo do mês fica</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(impact.balanceAfter)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      (antes {formatCurrency(impact.balanceBefore)})
                    </span>
                  </dd>
                </div>
                {kind !== "single" ? (
                  <>
                    <div>
                      <dt className="text-[10px] uppercase text-muted-foreground">
                        {kind === "installments" ? "Falta pagar" : "Valor por mês"}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCurrency(impact.remaining)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-muted-foreground">Termina em</dt>
                      <dd className="font-semibold">
                        {kind === "installments"
                          ? computedEnd
                            ? formatDate(`${computedEnd}T12:00:00`)
                            : "—"
                          : endDate
                            ? formatDate(`${endDate}T12:00:00`)
                            : "sem prazo"}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            ) : null}

            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={140}
              placeholder={`Onde foi? (opcional) — ex.: ${selected.name}`}
              className="h-10"
              aria-label="Descrição do gasto"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setSelected(null);
                  setDigits("");
                }}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Trocar categoria
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={save.isPending || cents <= 0}
                onClick={handleSave}
              >
                <Check className="size-4" aria-hidden />
                {kind === "installments"
                  ? `Salvar ${total || 0} parcelas`
                  : kind === "recurring"
                    ? "Criar recorrência"
                    : "Salvar gasto"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
