import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
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
          className="rounded-t-3xl border-t border-border bg-background px-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-0 sm:mx-auto sm:max-w-md focus-visible:outline-none"
          onOpenAutoFocus={(e) => {
            const currentYearBtn = document.getElementById(`year-btn-${year}`);
            if (currentYearBtn) {
              e.preventDefault();
              currentYearBtn.focus();
            }
          }}
        >
          {/* Cabeçalho com o período selecionado sempre visível */}
          <SheetHeader className="space-y-0 border-b border-border bg-gradient-to-b from-secondary/60 to-transparent px-4 pb-3 pt-4 text-left">
            <SheetTitle className="font-display text-[15px] font-semibold">
              Selecionar período
            </SheetTitle>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Selecionado:{" "}
              <strong className="text-foreground">
                {MONTH_NAMES[month - 1]} de {year}
              </strong>
            </p>
          </SheetHeader>

          <div className="px-4 pt-3">
            {/* Navegação de ano em linha própria, com setas dedicadas */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Ano anterior"
                onClick={() => onChange({ year: year - 1, month })}
              >
                <ChevronLeft className="size-4" />
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
                      "shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold tabular outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
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
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Próximo ano"
                onClick={() => onChange({ year: year + 1, month })}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div
              className="mt-3 grid grid-cols-4 gap-1.5"
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
                      "relative flex h-11 flex-col items-center justify-center rounded-xl border text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                      active
                        ? "border-brand bg-brand text-brand-foreground shadow-sm"
                        : cn(
                            "border-border bg-card hover:bg-muted",
                            isFuture ? "text-muted-foreground" : "text-foreground",
                          ),
                    )}
                  >
                    {name.slice(0, 3)}
                    {isCurrent && !active ? (
                      <span
                        aria-hidden
                        className="absolute bottom-1.5 size-1.5 rounded-full bg-brand"
                      />
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
