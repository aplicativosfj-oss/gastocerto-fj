import { useMemo, useState } from "react";
import { ArrowLeft, Check, Plus, Baby, PiggyBank, Gift, Trophy, Rocket, ToyBrick, ShieldCheck, Lock, TrendingUp, Target, Star, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { DependentDialog } from "@/components/finance/dependent-dialog";
import { KidsPinDialog } from "@/components/finance/kids-pin-dialog";

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

import { KidsEvolutionChart, KidsGoalsList } from "@/components/finance/kids-visuals";
import { KidsGoalDialog } from "@/components/finance/kids-goal-dialog";
import {
  useContributeKidsGoal,
  useKidsSavingsGoals,
  useRedeemKidsGoal,
  type KidsSavingsGoal,
} from "@/lib/kids-goals";
import {
  useAllowanceRecurrence,
  useKidsAlertSync,
  useKidsAlerts,
  useKidsSummaries,
} from "@/lib/kids-alerts";

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
  const historyRange = useMemo(
    () => ({
      start: isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1)),
      end: isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today.getFullYear(), today.getMonth()],
  );
  const { data: historyTransactions } = useTransactions(historyRange);

  const [manageOpen, setManageOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [kidsModeActive, setKidsModeActive] = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [selected, setSelected] = useState<Dependent | null>(null);
  const [reason, setReason] = useState<DependentReason>("ganho_mesada");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [note, setNote] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<KidsSavingsGoal | null>(null);

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

  const summaries = useKidsSummaries(active, monthTransactions);
  const alerts = useKidsAlerts(active, summaries);
  useKidsAlertSync(open ? alerts : []);

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

  const allowanceCategoryId = useMemo(() => {
    const list = (categories ?? []).filter((item) => item.type === "income");
    return (list.find((item) => item.name === "Mesada dos pais") ?? list[0])?.id ?? null;
  }, [categories]);

  useAllowanceRecurrence(active, allowanceCategoryId, open);

  const { data: goals } = useKidsSavingsGoals(selected?.id);
  const contribute = useContributeKidsGoal();
  const redeem = useRedeemKidsGoal();

  const selectedHistory = useMemo(
    () => (historyTransactions ?? []).filter((row) => dependentIdFromTags(row.tags) === selected?.id),
    [historyTransactions, selected],
  );
  const selectedSummary = selected ? summaries.get(selected.id) : undefined;
  const selectedAlerts = alerts.filter((item) => item.dependentId === selected?.id);

  const value = amount ? parseAmount(amount) : 0;
  const alreadySpent = selected ? (spentByDependent.get(selected.id) ?? 0) : 0;

  async function handleContribute(goal: KidsSavingsGoal) {
    const input = window.prompt("Quanto guardar nesta meta? (ex.: 10,50)");
    if (!input) return;
    const cents = parseAmount(input);
    if (!cents || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    try {
      const result = await contribute.mutateAsync({ goal, amount: cents });
      toast.success(
        result.reached ? "Meta conquistada! Fale com o responsável para o resgate." : "Moedinha guardada!",
      );
    } catch (error) {
      toast.error("Não foi possível guardar.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleRedeem(goal: KidsSavingsGoal, undo: boolean) {
    try {
      await redeem.mutateAsync({ id: goal.id, undo });
      toast.success(undo ? "Resgate desfeito." : "Recompensa marcada como entregue!");
    } catch (error) {
      toast.error("Não foi possível atualizar a recompensa.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

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
              <Baby className="size-5 text-primary" />
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

          {kidsModeActive && selected ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setKidsModeActive(false)}
                  className="rounded-xl"
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Sair do Modo Kids
                </Button>
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
                  <ShieldCheck className="size-3" />
                  MODO SEGURO
                </div>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Saldo Mágico</p>
                <h3 className="my-2 text-4xl font-black tabular-nums text-primary">
                  {formatCurrency(selectedSummary?.balance ?? 0)}
                </h3>
                <div className="flex items-center justify-center gap-3 text-[10px] font-semibold text-primary/70">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    Ganhos {formatCurrency(selectedSummary?.income ?? 0)}
                  </span>
                  <span>·</span>
                  <span>Gastos {formatCurrency(selectedSummary?.expense ?? 0)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evolução</h4>
                  <Star className="size-4 fill-yellow-500 text-yellow-500" />
                </div>
                <div className="rounded-3xl border bg-card p-4 shadow-sm">
                  <KidsEvolutionChart transactions={selectedHistory} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Metas Mágicas</h4>
                  <Target className="size-4 text-primary" />
                </div>
                <KidsGoalsList
                  goals={goals ?? []}
                  onAdd={() => toast.info("Peça ao seu responsável para criar uma meta!")}
                  onContribute={handleContribute}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  className="h-20 rounded-3xl flex-col gap-1 text-xs font-bold shadow-lg shadow-income/20 bg-income hover:bg-income/90 border-0"
                  onClick={() => {
                    setReason("ganho_presente");
                  }}
                >
                  <PiggyBank className="size-6" />
                  Ganhei Dinheiro
                </Button>
                <Button 
                  className="h-20 rounded-3xl flex-col gap-1 text-xs font-bold shadow-lg shadow-destructive/20 bg-destructive hover:bg-destructive/90 border-0"
                  onClick={() => {
                    setReason("gasto_lanche");
                  }}
                >
                  <Rocket className="size-6" />
                  Gastei Dinheiro
                </Button>
              </div>
            </div>
          ) : !selected ? (
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
                    const isLimitReached = item.monthly_limit && spent >= Number(item.monthly_limit);
                    
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelected(item);
                          if ((item as any).pin_code) {
                            setPinOpen(true);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isLimitReached && "border-destructive/30 bg-destructive/5"
                        )}
                      >
                        <div className="relative">
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: `${item.color ?? "#64748b"}22`,
                              color: item.color ?? undefined,
                            }}
                          >
                            {(item.nickname?.trim() || item.name).slice(0, 2).toUpperCase()}
                          </span>
                          {(item as any).pin_code && (
                            <div className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background shadow-sm border border-border">
                              <Lock className="size-2 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between">
                            <span className="block truncate text-sm font-semibold">
                              {item.nickname?.trim() || item.name}
                            </span>
                            {isLimitReached && <AlertTriangle className="size-3 text-destructive animate-pulse" />}
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
              <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3 border border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary">Painel do Responsável</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold"
                  onClick={() => setKidsModeActive(true)}
                >
                  <Baby className="mr-1 size-3" />
                  Ver como Criança
                </Button>
              </div>

              {selectedAlerts.length > 0 ? (
                <div className="space-y-2">
                  {selectedAlerts.map((alert) => (
                    <div
                      key={alert.title}
                      className={cn(
                        "rounded-xl border p-3",
                        alert.severity === "critical"
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-amber-500/30 bg-amber-500/5",
                      )}
                    >
                      <p className="flex items-center gap-1.5 text-xs font-bold">
                        <AlertTriangle
                          className={cn(
                            "size-3.5",
                            alert.severity === "critical" ? "text-destructive" : "text-amber-600",
                          )}
                        />
                        {alert.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{alert.message}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <dl className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/30 p-3 text-center text-xs">
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Ganhos</dt>
                  <dd className="font-semibold tabular-nums text-income">
                    {formatCurrency(selectedSummary?.income ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Gastos</dt>
                  <dd className="font-semibold tabular-nums text-destructive">
                    {formatCurrency(selectedSummary?.expense ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted-foreground">Saldo</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(selectedSummary?.balance ?? 0)}</dd>
                </div>
              </dl>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  Evolução por semana e por mês
                </p>
                <KidsEvolutionChart transactions={selectedHistory} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Target className="size-3.5" />
                    Metas e recompensas
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] font-bold"
                    onClick={() => {
                      setEditingGoal(null);
                      setGoalOpen(true);
                    }}
                  >
                    <Plus className="mr-1 size-3" />
                    Nova meta
                  </Button>
                </div>
                <KidsGoalsList
                  goals={goals ?? []}
                  onAdd={() => {
                    setEditingGoal(null);
                    setGoalOpen(true);
                  }}
                  onContribute={handleContribute}
                  onRedeem={handleRedeem}
                  canRedeem
                />
              </div>

              {selected.recurring_allowance_day ? (
                <p className="flex items-center gap-1.5 rounded-xl bg-primary/5 p-2 text-[10px] text-muted-foreground">
                  <RefreshCw className="size-3 text-primary" />
                  Mesada automática todo dia {selected.recurring_allowance_day}
                  {selected.last_allowance_month
                    ? ` — último lançamento em ${selected.last_allowance_month}`
                    : " — será lançada no próximo ciclo"}
                  .
                </p>
              ) : null}



              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Motivo do lançamento
                </Label>

                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                        <div className={cn(
                          "flex size-7 items-center justify-center rounded-lg",
                          item.type === "income" ? "bg-income/10 text-income" : "bg-destructive/10 text-destructive"
                        )}>
                          <Icon className="size-4" aria-hidden />
                        </div>
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
                        Saldo após mesada de {formatCurrency(Number(selected.monthly_allowance))}
                      </dt>
                      <dd className="font-semibold tabular-nums text-primary">
                        {formatCurrency(
                          toCents(
                            Number(selected.monthly_allowance) - (alreadySpent + (reasonInfo.type === "income" ? -value : value))
                          )
                        )}
                      </dd>
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
              <Baby className="size-3.5" aria-hidden />
              {active.length} criança(s) cadastrada(s).
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <DependentDialog open={manageOpen} onOpenChange={setManageOpen} dependent={editing} />
      
      {selected && (
        <KidsPinDialog 
          open={pinOpen} 
          onOpenChange={setPinOpen} 
          pin={(selected as any).pin_code} 
          onSuccess={() => setKidsModeActive(true)}
        />
      )}
    </>
  );
}

