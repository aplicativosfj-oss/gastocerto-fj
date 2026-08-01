import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { MONTH_NAMES } from "@/lib/finance";
import { cn } from "@/lib/utils";

interface PeriodPickerProps {
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
  className?: string;
}

export function PeriodPicker({ year, month, onChange, className }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const years = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index);

  function shift(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    onChange({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  const handleSelect = (y: number, m: number) => {
    onChange({ year: y, month: m });
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => shift(-1)}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="h-9 min-w-[120px] justify-start gap-2 px-3 text-left font-bold tracking-tight sm:min-w-[140px]"
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {MONTH_NAMES[month - 1]} {year}
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-6 sm:max-w-md sm:mx-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center font-display text-xl font-bold">
              Selecionar período
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => onChange({ year: y, month })}
                  className={cn(
                    "rounded-lg px-2 py-1 text-sm font-bold transition-all",
                    y === year
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {y}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MONTH_NAMES.map((name, index) => {
                const m = index + 1;
                const active = m === month;
                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(year, m)}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-xl text-sm font-bold transition-all",
                      active
                        ? "bg-brand text-brand-foreground shadow-md scale-95"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                    )}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => shift(1)}
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
