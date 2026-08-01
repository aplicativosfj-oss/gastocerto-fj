import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { FeatureGate } from "@/components/finance/feature-gate";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { isoDate, parseAmount } from "@/lib/finance";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import {
  GOAL_STATUS,
  GOAL_TYPES,
  goalProgress,
  useAddContribution,
  useDeleteGoal,
  useGoalContributions,
  useGoals,
  useSaveGoal,
  type Goal,
} from "@/lib/goals";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas financeiras — GastoCerto" },
      {
        name: "description",
        content: "Defina objetivos de economia e acompanhe o progresso mês a mês.",
      },
      { property: "og:title", content: "Metas financeiras — GastoCerto" },
      {
        property: "og:description",
        content: "Defina objetivos de economia e acompanhe o progresso mês a mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const { data: contributions } = useGoalContributions();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [open, setOpen] = useState(false);
  const [contributingTo, setContributingTo] = useState<Goal | null>(null);
  const deleteGoal = useDeleteGoal();

  const summary = useMemo(() => {
    const list = goals ?? [];
    const target = list.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
    const saved = list.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
    const completed = list.filter((goal) => goalProgress(goal).isComplete).length;
    return { target, saved, completed, total: list.length };
  }, [goals]);

  const monthContributions = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return (contributions ?? [])
      .filter((item) => item.contribution_date.startsWith(prefix))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [contributions]);

  return (
    <AppShell>
      <FeatureGate feature="goals">
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Metas</h1>
            <p className="text-sm text-muted-foreground">
              Defina objetivos e acompanhe a evolução mensal do que você guarda.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Nova meta
          </Button>
        </header>

        <div className="grid gap-3 auto-cards-sm">
          <SummaryCard label="Metas ativas" value={String(summary.total)} />
          <SummaryCard label="Total acumulado" value={formatCurrency(summary.saved)} />
          <SummaryCard label="Objetivo total" value={formatCurrency(summary.target)} />
          <SummaryCard label="Aportes deste mês" value={formatCurrency(monthContributions)} />
        </div>

        {isLoading ? (
          <div className="auto-cards-md">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : (goals ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Target className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma meta criada. Comece definindo quanto quer guardar e até quando.
            </p>
          </div>
        ) : (
          <div className="auto-cards-md">
            {(goals ?? []).map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                contributions={(contributions ?? []).filter((item) => item.goal_id === goal.id)}
                onEdit={() => {
                  setEditing(goal);
                  setOpen(true);
                }}
                onContribute={() => setContributingTo(goal)}
                onDelete={async () => {
                  if (!window.confirm(`Excluir a meta "${goal.name}"?`)) return;
                  try {
                    await deleteGoal.mutateAsync(goal.id);
                    toast.success("Meta excluída");
                  } catch (error) {
                    console.error("[metas] falha ao excluir", error);
                    toast.error("Não foi possível excluir a meta");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <GoalDialog open={open} onOpenChange={setOpen} goal={editing} />
      <ContributionDialog goal={contributingTo} onClose={() => setContributingTo(null)} />
    </FeatureGate>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function GoalCard({
  goal,
  contributions,
  onEdit,
  onContribute,
  onDelete,
}: {
  goal: Goal;
  contributions: Array<{ id: string; amount: number; contribution_date: string }>;
  onEdit: () => void;
  onContribute: () => void;
  onDelete: () => void;
}) {
  const progress = goalProgress(goal);
  const typeLabel = GOAL_TYPES.find((item) => item.value === goal.goal_type)?.label ?? goal.goal_type;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{goal.name}</h2>
          <p className="text-xs text-muted-foreground">
            {typeLabel}
            {goal.target_date ? ` · até ${formatDate(goal.target_date)}` : ""}
          </p>
        </div>
        <Badge variant={progress.isComplete ? "default" : "secondary"}>
          {progress.isComplete
            ? "Concluída"
            : (GOAL_STATUS.find((item) => item.value === goal.status)?.label ?? goal.status)}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={progress.percent} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatCurrency(Number(goal.current_amount))} de{" "}
            {formatCurrency(Number(goal.target_amount))}
          </span>
          <span className="font-medium text-foreground">{formatPercent(progress.percent, 1)}</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Faltam</dt>
          <dd className="font-medium">{formatCurrency(progress.remaining)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Meses restantes</dt>
          <dd className="font-medium">{progress.monthsLeft ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Por mês</dt>
          <dd className="font-medium">
            {progress.monthlyNeeded ? formatCurrency(progress.monthlyNeeded) : "—"}
          </dd>
        </div>
      </dl>

      {contributions.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Último aporte: {formatCurrency(Number(contributions[0].amount))} em{" "}
          {formatDate(contributions[0].contribution_date)} · {contributions.length} aporte(s)
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onContribute}>
          <TrendingUp className="mr-2 size-4" />
          Registrar aporte
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </article>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}) {
  const save = useSaveGoal();
  const [goalType, setGoalType] = useState("saving");
  const [status, setStatus] = useState("active");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const target = parseAmount(String(form.get("target") ?? ""));
    const current = parseAmount(String(form.get("current") ?? "0")) || 0;

    if (name.length < 2) {
      toast.error("Informe um nome para a meta");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      toast.error("Informe um valor objetivo válido");
      return;
    }

    try {
      await save.mutateAsync({
        id: goal?.id,
        values: {
          name,
          goal_type: goalType,
          target_amount: target,
          current_amount: current,
          start_date: String(form.get("startDate") || isoDate(new Date())),
          target_date: String(form.get("targetDate") || "") || null,
          notes: String(form.get("notes") ?? "").trim() || null,
          status,
        },
      });
      toast.success(goal ? "Meta atualizada" : "Meta criada");
      onOpenChange(false);
    } catch (error) {
      console.error("[metas] falha ao salvar", error);
      toast.error("Não foi possível salvar a meta");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setGoalType(goal?.goal_type ?? "saving");
          setStatus(goal?.status ?? "active");
        }
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>
            Defina o objetivo, o prazo e acompanhe quanto falta a cada mês.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" key={goal?.id ?? "new"}>
          <div>
            <Label htmlFor="goal-name">Nome</Label>
            <Input
              id="goal-name"
              name="name"
              defaultValue={goal?.name ?? ""}
              placeholder="Reserva de emergência"
              className="mt-1.5"
            />
          </div>

          <div className="auto-cards-md">
            <div>
              <Label>Tipo</Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Situação</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="auto-cards-md">
            <div>
              <Label htmlFor="goal-target">Valor objetivo</Label>
              <MoneyInput
                id="goal-target"
                name="target"
                defaultValue={goal?.target_amount ?? null}
                placeholder="5.000,00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="goal-current">Já acumulado</Label>
              <MoneyInput
                id="goal-current"
                name="current"
                defaultValue={goal?.current_amount ?? null}
                placeholder="0,00"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="auto-cards-md">
            <div>
              <Label htmlFor="goal-start">Início</Label>
              <Input
                id="goal-start"
                name="startDate"
                type="date"
                defaultValue={goal?.start_date ?? isoDate(new Date())}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="goal-end">Prazo</Label>
              <Input
                id="goal-end"
                name="targetDate"
                type="date"
                defaultValue={goal?.target_date ?? ""}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="goal-notes">Observações</Label>
            <Textarea
              id="goal-notes"
              name="notes"
              rows={2}
              defaultValue={goal?.notes ?? ""}
              className="mt-1.5"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar meta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContributionDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const addContribution = useAddContribution();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal) return;
    const form = new FormData(event.currentTarget);
    const amount = parseAmount(String(form.get("amount") ?? ""));
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await addContribution.mutateAsync({
        goalId: goal.id,
        amount,
        date: String(form.get("date") || isoDate(new Date())),
        notes: String(form.get("notes") ?? "").trim(),
        currentAmount: Number(goal.current_amount || 0),
      });
      toast.success("Aporte registrado");
      onClose();
    } catch (error) {
      console.error("[metas] falha ao registrar aporte", error);
      toast.error("Não foi possível registrar o aporte");
    }
  }

  return (
    <Dialog open={Boolean(goal)} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar aporte</DialogTitle>
          <DialogDescription>{goal?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contribution-amount">Valor</Label>
            <MoneyInput
              id="contribution-amount"
              name="amount"
              placeholder="250,00"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use valor negativo para registrar uma retirada.
            </p>
          </div>
          <div>
            <Label htmlFor="contribution-date">Data</Label>
            <Input
              id="contribution-date"
              name="date"
              type="date"
              defaultValue={isoDate(new Date())}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="contribution-notes">Observação</Label>
            <Input id="contribution-notes" name="notes" className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addContribution.isPending}>
              {addContribution.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
