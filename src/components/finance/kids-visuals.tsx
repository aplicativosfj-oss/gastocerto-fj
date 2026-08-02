import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Star, Trophy, Target, Gift, Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { KidsSavingsGoal } from "@/lib/kids-goals";
import { cn } from "@/lib/utils";

type Txn = { transaction_type: string; amount: number | string; transaction_date: string };

function weekBuckets(transactions: Txn[]) {
  const weeks: { key: string; label: string; ganhos: number; gastos: number }[] = [];
  const today = new Date();
  for (let i = 7; i >= 0; i--) {
    const ref = new Date(today);
    ref.setDate(ref.getDate() - i * 7);
    const monday = new Date(ref);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (!weeks.some((w) => w.key === key)) {
      weeks.push({
        key,
        label: `${String(monday.getDate()).padStart(2, "0")}/${String(monday.getMonth() + 1).padStart(2, "0")}`,
        ganhos: 0,
        gastos: 0,
      });
    }
  }
  for (const t of transactions) {
    const d = new Date(`${t.transaction_date}T12:00:00`);
    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const bucket = weeks.find((w) => w.key === monday.toISOString().slice(0, 10));
    if (!bucket) continue;
    if (t.transaction_type === "income") bucket.ganhos += Number(t.amount) / 100;
    else if (t.transaction_type === "expense") bucket.gastos += Number(t.amount) / 100;
  }
  return weeks;
}

function monthBuckets(transactions: Txn[]) {
  const months: { key: string; label: string; ganhos: number; gastos: number }[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      key: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`,
      label: ref.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      ganhos: 0,
      gastos: 0,
    });
  }
  for (const t of transactions) {
    const bucket = months.find((m) => t.transaction_date.startsWith(m.key));
    if (!bucket) continue;
    if (t.transaction_type === "income") bucket.ganhos += Number(t.amount) / 100;
    else if (t.transaction_type === "expense") bucket.gastos += Number(t.amount) / 100;
  }
  return months;
}

/**
 * Gráfico lúdico do Espaço Kids: evolução do saldo e das receitas/despesas
 * por semana ou por mês.
 */
export function KidsEvolutionChart({ transactions }: { transactions: Txn[] }) {
  const [mode, setMode] = useState<"week" | "month">("week");

  const data = useMemo(
    () => (mode === "week" ? weekBuckets(transactions) : monthBuckets(transactions)),
    [transactions, mode],
  );

  const balance = useMemo(() => {
    let acc = 0;
    return data.map((row) => {
      acc += row.ganhos - row.gastos;
      return { ...row, saldo: acc };
    });
  }, [data]);

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-1 rounded-full bg-muted p-1">
        {(["week", "month"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={mode === option ? "secondary" : "ghost"}
            className="h-7 flex-1 rounded-full text-[11px] font-bold"
            onClick={() => setMode(option)}
          >
            {option === "week" ? "Por semana" : "Por mês"}
          </Button>
        ))}
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={balance}>
            <defs>
              <linearGradient id="kidsBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#888888" }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              formatter={(value: number | string) => formatCurrency(Number(value) * 100)}
            />
            <Area
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#kidsBalance)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#888888" }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              formatter={(value: number | string) => formatCurrency(Number(value) * 100)}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="ganhos" name="Ganhos" fill="#22c55e" radius={[6, 6, 0, 0]} />
            <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Metas de poupança com fluxo de conquista e resgate da recompensa.
 */
export function KidsGoalsList({
  goals,
  onAdd,
  onContribute,
  onRedeem,
  canRedeem = false,
}: {
  goals: KidsSavingsGoal[];
  onAdd: () => void;
  onContribute?: (goal: KidsSavingsGoal) => void;
  onRedeem?: (goal: KidsSavingsGoal, undo: boolean) => void;
  canRedeem?: boolean;
}) {
  if (goals.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center transition hover:bg-primary/10"
      >
        <Star className="mb-2 size-8 text-primary/40" />
        <p className="text-sm font-medium text-primary/60">Crie sua primeira meta mágica!</p>
        <p className="mt-1 text-[10px] text-muted-foreground">Junte moedinhas para algo especial</p>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const target = Number(goal.target_amount) || 0;
        const current = Number(goal.current_amount) || 0;
        const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        const done = Boolean(goal.completed_at) || (target > 0 && current >= target);
        const redeemed = Boolean(goal.redeemed_at);

        return (
          <div
            key={goal.id}
            className={cn(
              "rounded-2xl border bg-card p-4 shadow-sm",
              done && !redeemed && "border-yellow-500/40 bg-yellow-500/5",
              redeemed && "opacity-70",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Target className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{goal.title}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {redeemed
                      ? "Recompensa entregue 🎉"
                      : done
                        ? "Meta conquistada! Fale com seu responsável."
                        : `Faltam ${formatCurrency(Math.max(0, target - current))} para o prêmio`}
                  </p>
                </div>
              </div>
              <Star
                className={cn(
                  "size-5",
                  done ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/20",
                  done && !redeemed && "animate-pulse",
                )}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium">
                <span>{formatCurrency(current)}</span>
                <span>{formatCurrency(target)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full transition-all duration-1000", done ? "bg-yellow-500" : "bg-primary")}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {goal.reward ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-yellow-500/10 p-2 text-[10px] font-semibold text-yellow-700">
                <Trophy className="size-3" />
                <span>Recompensa: {goal.reward}</span>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {onContribute && !done ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-[11px] font-bold"
                  onClick={() => onContribute(goal)}
                >
                  <Star className="mr-1 size-3" />
                  Guardar moedinha
                </Button>
              ) : null}

              {canRedeem && done && !redeemed && onRedeem ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full bg-yellow-500 text-[11px] font-bold text-yellow-950 hover:bg-yellow-500/90"
                  onClick={() => onRedeem(goal, false)}
                >
                  <Gift className="mr-1 size-3" />
                  Marcar recompensa entregue
                </Button>
              ) : null}

              {canRedeem && redeemed && onRedeem ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full text-[11px]"
                  onClick={() => onRedeem(goal, true)}
                >
                  <RotateCcw className="mr-1 size-3" />
                  Desfazer resgate
                </Button>
              ) : null}

              {redeemed ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                  <Check className="size-3" />
                  Conquista concluída
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
