import { useMemo } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { Star, Trophy, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Gráfico de evolução lúdico para o Espaço Kids
 */
export function KidsEvolutionChart({ transactions }: { transactions: any[] }) {
  const data = useMemo(() => {
    const daily = new Map<string, { income: number; expense: number }>();
    
    // Pegar últimos 14 dias
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      daily.set(key, { income: 0, expense: 0 });
    }

    transactions.forEach(t => {
      const date = t.transaction_date;
      if (daily.has(date)) {
        const val = daily.get(date)!;
        if (t.transaction_type === "income") val.income += Number(t.amount);
        else val.expense += Number(t.amount);
      }
    });

    return Array.from(daily.entries()).map(([date, vals]) => ({
      date: date.split("-").reverse().slice(0, 2).join("/"),
      ganhos: vals.income / 100,
      gastos: vals.expense / 100,
    }));
  }, [transactions]);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "#888888" }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Area 
            type="monotone" 
            dataKey="ganhos" 
            stroke="#22c55e" 
            fillOpacity={1} 
            fill="url(#colorIncome)" 
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Visualização de Metas de Poupança para Crianças
 */
export function KidsGoalsList({ goals, onAdd }: { goals: any[], onAdd: () => void }) {
  if (goals.length === 0) {
    return (
      <div 
        onClick={onAdd}
        className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center transition hover:bg-primary/10"
      >
        <Star className="mb-2 size-8 text-primary/40" />
        <p className="text-sm font-medium text-primary/60">Crie sua primeira meta mágica!</p>
        <p className="text-[10px] text-muted-foreground mt-1">Junte moedinhas para algo especial</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map(goal => {
        const percent = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
        return (
          <div key={goal.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Target className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{goal.title}</h4>
                  <p className="text-[10px] text-muted-foreground">Falta pouco para o seu prêmio!</p>
                </div>
              </div>
              <Star className={cn("size-5", percent === 100 ? "text-yellow-500 fill-yellow-500 animate-pulse" : "text-muted-foreground/20")} />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium">
                <span>{formatCurrency(goal.current_amount)}</span>
                <span>{formatCurrency(goal.target_amount)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            
            {goal.reward && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-yellow-500/10 p-2 text-[10px] font-semibold text-yellow-700">
                <Trophy className="size-3" />
                <span>Recompensa: {goal.reward}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
