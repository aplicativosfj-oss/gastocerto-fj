import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterPanelProps = {
  title?: string;
  description?: string;
  /** Quantidade de filtros diferentes do padrão — exibida como selo. */
  activeCount?: number;
  onClear?: () => void;
  children: ReactNode;
  className?: string;
  /** Fica recolhido por padrão no mobile. */
  collapsibleOnMobile?: boolean;
};

/**
 * Bloco de filtros consistente: cabeçalho com contagem de filtros ativos,
 * botão de limpar e recolhimento automático em telas pequenas.
 */
export function FilterPanel({
  title = "Filtros",
  description,
  activeCount = 0,
  onClear,
  children,
  className,
  collapsibleOnMobile = true,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold leading-tight">{title}</p>
            {description ? (
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {description}
              </p>
            ) : null}
          </div>
          {activeCount > 0 ? (
            <span className="shrink-0 rounded-full border border-brand/30 bg-brand/12 px-2 py-0.5 text-[10.5px] font-bold text-brand tabular">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onClear && activeCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onClear}>
              <X className="mr-1 size-3.5" aria-hidden="true" />
              Limpar
            </Button>
          ) : null}
          {collapsibleOnMobile ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] sm:hidden"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Fechar" : "Abrir"}
              <ChevronDown
                className={cn("ml-1 size-3.5 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </Button>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "grid gap-2.5 p-3 sm:gap-3 sm:p-4 auto-cards-sm",
          collapsibleOnMobile && !open && "hidden sm:grid",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Campo de filtro com rótulo padronizado. */
export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
