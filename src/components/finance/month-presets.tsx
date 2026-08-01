import { useEffect } from "react";
import { CalendarRange } from "lucide-react";

import { cn } from "@/lib/utils";

export type MonthPeriod = { year: number; month: number };

const KEY_PREFIX = "gc.period.";

/** Lê o último mês escolhido pelo usuário nesta tela. */
export function loadPeriod(scope: string): MonthPeriod | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MonthPeriod;
    if (typeof parsed?.year === "number" && typeof parsed?.month === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function savePeriod(scope: string, period: MonthPeriod) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${scope}`, JSON.stringify(period));
  } catch {
    /* aba privada: segue sem salvar */
  }
}

function shiftMonth(offset: number): MonthPeriod {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * Atalhos de mês para telas mensais (Receitas, Orçamentos).
 * Guarda a última escolha no aparelho para o usuário não repetir o ajuste.
 */
export function MonthPresets({
  scope,
  value,
  onChange,
  className,
}: {
  scope: string;
  value: MonthPeriod;
  onChange: (period: MonthPeriod) => void;
  className?: string;
}) {
  useEffect(() => {
    savePeriod(scope, value);
  }, [scope, value]);

  const options = [
    { label: "Este mês", period: shiftMonth(0) },
    { label: "Mês anterior", period: shiftMonth(-1) },
    { label: "2 meses atrás", period: shiftMonth(-2) },
    { label: "3 meses atrás", period: shiftMonth(-3) },
  ];

  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border border-border bg-card/60 p-2.5",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <CalendarRange className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
        <span className="truncate">Períodos rápidos</span>
      </p>
      <div
        role="group"
        aria-label="Atalhos de período"
        className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => {
          const active =
            option.period.year === value.year && option.period.month === value.month;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.period)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-brand/50 bg-brand/15 text-brand"
                  : "border-border bg-secondary/70 text-foreground hover:border-brand/40 hover:bg-brand/10",
              )}
            >
              {option.label}
              <span className="ml-1 text-[10px] text-muted-foreground">
                {MONTH_LABELS[option.period.month - 1]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
