import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Check, X } from "lucide-react";
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
  const today = new Date();
  const years = Array.from({ length: 7 }, (_, index) => today.getFullYear() - 3 + index);

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
        <SheetContent
          side="bottom"
          className="max-h-[86svh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border bg-background px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-0 sm:mx-auto sm:max-w-md focus-visible:outline-none"
          onOpenAutoFocus={(e) => {
            const currentYearBtn = document.getElementById(`year-btn-${year}`);
            if (currentYearBtn) {
              e.preventDefault();
              currentYearBtn.focus();
            }
          }}
        >
          {/* Cabeçalho fixo: mantém o período selecionado visível ao rolar */}
          <SheetHeader className="sticky top-0 z-10 space-y-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 text-left backdrop-blur-md">
            <span aria-hidden className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-muted" />
            <SheetTitle className="font-display text-base font-semibold">
              Selecionar período
            </SheetTitle>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-brand-foreground">
                <CalendarDays className="size-3.5" aria-hidden />
                {MONTH_NAMES[month - 1]} de {year}
              </span>
              <span className="text-[11px] text-muted-foreground">período em uso</span>
            </div>
          </SheetHeader>

          <div className="px-4 pt-4">
            {/* Navegação de ano em linha própria, com setas dedicadas */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Ano anterior"
                onClick={() => onChange({ year: year - 1, month })}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <div
                className="flex flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="group"
                aria-label="Selecionar ano"
              >
                {years.map((y) => (
                  <button
                    key={y}
                    id={`year-btn-${y}`}
                    onClick={() => onChange({ year: y, month })}
                    aria-pressed={y === year}
                    className={cn(
                      "min-h-11 shrink-0 rounded-xl px-3.5 text-[14px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                      y === year
                        ? "bg-brand text-brand-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Próximo ano"
                onClick={() => onChange({ year: year + 1, month })}
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>

            <div
              className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
              role="grid"
              aria-label="Meses do ano"
            >
              {MONTH_NAMES.map((name, index) => {
                const m = index + 1;
                const active = m === month;
                const isCurrent = year === today.getFullYear() && m === today.getMonth() + 1;
                const isFuture =
                  year > today.getFullYear() ||
                  (year === today.getFullYear() && m > today.getMonth() + 1);
                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(year, m)}
                    aria-label={`${name} de ${year}`}
                    aria-selected={active}
                    role="gridcell"
                    className={cn(
                      "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[14px] font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                      active
                        ? "border-brand bg-brand text-brand-foreground shadow-soft ring-2 ring-brand/25"
                        : cn(
                            "border-border bg-card hover:bg-muted active:scale-[0.98]",
                            isFuture ? "text-muted-foreground" : "text-foreground",
                          ),
                    )}
                  >
                    {name.slice(0, 3)}
                    {active ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : isCurrent ? (
                      <span className="text-[10px] font-medium text-brand">hoje</span>
                    ) : null}
                  </button>
                );
              })}
            </div>


            {/* Atalhos rápidos */}
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => handleSelect(today.getFullYear(), today.getMonth() + 1)}
              >
                Mês atual
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => {
                  const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  handleSelect(previous.getFullYear(), previous.getMonth() + 1);
                }}
              >
                Mês anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 text-[12px]"
                onClick={() => setOpen(false)}
              >
                <X className="size-3.5" aria-hidden />
                Fechar
              </Button>
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
