import { useMemo, useState } from "react";
import { ArrowLeft, Check, Plus, ToyBrick, PiggyBank, Gift, Trophy, Rocket } from "lucide-react";
import { toast } from "sonner";

import { DependentDialog } from "@/components/finance/dependent-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { categoryIcon } from "@/lib/category-icons";
import {
  DEPENDENT_REASONS,
  dependentAge,
  dependentIdFromTags,
  dependentTag,
  reasonTag,
  relationLabel,
  useDependents,
  type Dependent,
  type DependentReason,
} from "@/lib/dependents";
import { isoDate, monthRange, parseAmount, toCents } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useSaveTransaction, useTransactions } from "@/lib/transactions";
import { cn } from "@/lib/utils";

function shiftIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

/**
 * Gasto extra com filhos/dependentes: escolhe a pessoa, o motivo (pix, lanche,
 * presente, material didático...) e o valor. O lançamento fica marcado com o
 * dependente para o pai acompanhar quanto gasta com cada filho no mês.
 */
export function DependentExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: dependents } = useDependents();
  const { data: categories } = useCategories();
  const save = useSaveTransaction();

  const today = new Date();
  const range = monthRange(today.getFullYear(), today.getMonth() + 1);
  const { data: monthTransactions } = useTransactions(range);

  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [selected, setSelected] = useState<Dependent | null>(null);
  const [reason, setReason] = useState<DependentReason>("ganho_mesada");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [note, setNote] = useState("");

  const active = (dependents ?? []).filter((item) => item.active !== false);

  /** Quanto já foi gasto no mês com cada dependente. */
  const spentByDependent = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of monthTransactions ?? []) {
      if (row.transaction_type !== "expense") continue;
      const id = dependentIdFromTags(row.tags);
      if (!id) continue;
      map.set(id, toCents((map.get(id) ?? 0) + Number(row.amount)));
    }
    return map;
  }, [monthTransactions]);

  const reasonInfo = DEPENDENT_REASONS.find((item) => item.value === reason)!;

  const category = useMemo(() => {
    const list = (categories ?? []).filter((item) => item.type === reasonInfo.type);
    return (
      list.find((item) => item.name === reasonInfo.category) ??
      list.find((item) => item.name === (reasonInfo.type === "expense" ? "Gastos da Criança" : "Mesada dos pais")) ??
      list[0] ??
      null
    );
  }, [categories, reasonInfo]);

  const value = amount ? parseAmount(amount) : 0;
  const alreadySpent = selected ? (spentByDependent.get(selected.id) ?? 0) : 0;

  function reset() {
    setSelected(null);
    setReason("ganho_mesada");
    setAmount("");
    setDate(isoDate(new Date()));
    setNote("");
  }

  async function handleSave() {
    if (!selected) return;
    if (value <= 0) {
      toast.error("Informe o valor do gasto.");
      return;
    }
    if (!category) {
      toast.error("Nenhuma categoria de despesa disponível.");
      return;
    }
    const who = selected.nickname?.trim() || selected.name;
    const description = note.trim()
      ? `${who} — ${note.trim()}`.slice(0, 140)
      : `${who} — ${reasonInfo.label}`;
    try {
      await save.mutateAsync({
        values: {
          description,
          amount: value,
          transaction_type: reasonInfo.type,
          category_id: category.id,
          transaction_date: date,
          status: reasonInfo.type === "income" ? "received" : "paid",
          payment_date: date,
          tags: [dependentTag(selected.id), reasonTag(reason)],
          notes: `${reasonInfo.type === "income" ? "Ganho" : "Gasto"} com ${who} (${relationLabel(selected.relation)}) — ${reasonInfo.label}`,
        },
      });
      toast.success(`${formatCurrency(value)} com ${who} registrado.`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível registrar o gasto.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ToyBrick className="size-5 text-primary" />
              {selected
                ? `Espaço Kids — ${selected.nickname?.trim() || selected.name}`
                : "Espaço Kids: Gestão para Pequenos"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? "Registre ganhos e gastos das crianças. Ensine educação financeira na prática!"
                : "Cadastre as crianças para gerenciar mesadas, presentes e ensinar o valor do dinheiro."}
            </DialogDescription>
          </DialogHeader>

          {!selected ? (
            <div className="space-y-3">
              {active.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nenhum dependente cadastrado ainda. Cadastre seus filhos para separar os gastos
                  de cada um.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {active.map((item) => {
                    const age = dependentAge(item);
                    const spent = spentByDependent.get(item.id) ?? 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item)}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: `${item.color ?? "#64748b"}22`,
                            color: item.color ?? undefined,
                          }}
                        >
                          {(item.nickname?.trim() || item.name).slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {item.nickname?.trim() || item.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {relationLabel(item.relation)}
                            {age !== null ? ` · ${age} anos` : ""}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            No mês: {formatCurrency(spent)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEditing(null);
                  setManageOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                Cadastrar criança (filho, sobrinho, afilhado...)
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Motivo do gasto
                </Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {DEPENDENT_REASONS.map((item) => {
                    const Icon = categoryIcon(item.icon);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setReason(item.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition",
                          reason === item.value
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                        <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Vai para a categoria <strong>{category?.name ?? "—"}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="dep-amount">Valor</Label>
                  <MoneyInput
                    id="dep-amount"
                    value={amount}
                    onValueChange={setAmount}
                    placeholder="0,00"
                    className="mt-1 text-lg font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="dep-date">Data</Label>
                  <Input
                    id="dep-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-1"
                  />
                </div>
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
                    className="h-8 text-[11px]"
                    onClick={() => setDate(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={120}
                placeholder="Detalhe (opcional) — ex.: sorvete no shopping, caderno"
              />

              {value > 0 ? (
                <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
                  <div>
                    <dt className="text-[10px] uppercase text-muted-foreground">Já gasto no mês</dt>
                    <dd className="font-semibold tabular-nums">{formatCurrency(alreadySpent)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-muted-foreground">
                      {reasonInfo.type === "income" ? "Total após ganho" : "Total após gasto"}
                    </dt>
                    <dd className={cn(
                      "font-semibold tabular-nums",
                      reasonInfo.type === "income" ? "text-primary" : "text-destructive"
                    )}>
                      {formatCurrency(toCents(alreadySpent + (reasonInfo.type === "income" ? -value : value)))}
                    </dd>
                  </div>
                  {selected.monthly_allowance ? (
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase text-muted-foreground">
                        Mesada cadastrada: {formatCurrency(Number(selected.monthly_allowance))}
                      </dt>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Trocar pessoa
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={save.isPending || value <= 0}
                  onClick={handleSave}
                >
                  <Check className="size-4" aria-hidden />
                  Salvar Lançamento
                </Button>
              </div>
            </div>
          )}

          {active.length > 0 && !selected ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ToyBrick className="size-3.5" aria-hidden />
              {active.length} criança(s) cadastrada(s).
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <DependentDialog open={manageOpen} onOpenChange={setManageOpen} dependent={editing} />
    </>
  );
}
