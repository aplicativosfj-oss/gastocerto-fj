import { useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { usePeriodStore } from "@/lib/period-store";
import { useTransactions } from "@/lib/transactions";
import { monthRange, isoDate, MONTH_NAMES } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InteractiveCalendarProps {
  onDayClick: (day: number) => void;
}

export function InteractiveCalendar({ onDayClick }: InteractiveCalendarProps) {
  const { year, month, setPeriod } = usePeriodStore();
  const range = monthRange(year, month);
  const { data: transactions } = useTransactions(range);
  const today = isoDate(new Date());

  const days = useMemo(() => {
    const list = [];
    for (let d = 1; d <= range.days; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTransactions = (transactions ?? []).filter(t => t.transaction_date === dateStr);
      
      const income = dayTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expense = dayTransactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      list.push({
        day: d,
        date: dateStr,
        isToday: dateStr === today,
        income,
        expense,
        count: dayTransactions.length
      });
    }
    return list;
  }, [year, month, range.days, transactions, today]);

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setPeriod({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-brand" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Calendário de Fluxo</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-bold min-w-[100px] text-center">
            {MONTH_NAMES[month-1]} {year}
          </span>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="pb-2 text-center text-[10px] font-bold text-muted-foreground uppercase">
            {d}
          </div>
        ))}
        
        {days.map(d => (
          <button
            key={d.day}
            onClick={() => onDayClick(d.day)}
            className={cn(
              "group relative flex flex-col items-center justify-between rounded-xl border border-border/40 p-1.5 transition-all hover:border-brand/50 hover:bg-brand/5",
              d.isToday && "border-brand bg-brand/5 ring-1 ring-brand/20",
              d.count === 0 && "opacity-60"
            )}
          >
            <span className={cn(
              "text-[10px] font-bold",
              d.isToday ? "text-brand" : "text-muted-foreground"
            )}>
              {d.day}
            </span>
            
            <div className="mt-1 flex flex-col gap-0.5 w-full">
              {d.income > 0 && (
                <div className="h-1 w-full rounded-full bg-emerald-500/80" title={`Receita: ${formatCurrency(d.income)}`} />
              )}
              {d.expense > 0 && (
                <div className="h-1 w-full rounded-full bg-rose-500/80" title={`Despesa: ${formatCurrency(d.expense)}`} />
              )}
            </div>
            
            {d.count > 0 && (
              <div className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-brand text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                {d.count}
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-muted-foreground">Receitas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-rose-500" />
          <span className="text-[10px] text-muted-foreground">Despesas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Info className="size-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground italic">Clique no dia para detalhes</span>
        </div>
      </div>
    </div>
  );
}
