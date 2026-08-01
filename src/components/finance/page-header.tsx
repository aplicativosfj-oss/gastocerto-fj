import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

/**
 * Cabeçalho padrão das páginas internas: faixa com ícone da marca,
 * título, descrição e área de ações que se reorganiza no mobile.
 */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-soft sm:p-5",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--brand)_55%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_70%)]"
      />
      <div className="relative grid gap-3 xl:grid-cols-[minmax(18rem,1fr)_auto] xl:items-center">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
          {Icon ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand sm:size-11">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-brand sm:text-[11px]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="truncate font-display text-[17px] font-bold leading-tight tracking-tight sm:text-xl lg:text-[22px]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-prose text-[12px] leading-snug text-pretty text-muted-foreground sm:text-[13px]">
                {description}
              </p>
            ) : null}
            {meta ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div> : null}
          </div>
        </div>
        {actions ? (
          <div className="-mx-0.5 flex min-w-0 max-w-full items-center gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] xl:flex-wrap xl:overflow-visible xl:pb-0 xl:justify-end [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

const toneClass = {
  brand: "border-brand/25 bg-brand/10 text-brand",
  success: "border-success/30 bg-success/12 text-success",
  destructive: "border-destructive/30 bg-destructive/12 text-destructive",
  warning: "border-warning/30 bg-warning/14 text-warning",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof toneClass;

/** Chip informativo compacto usado nos cabeçalhos e filtros. */
export function MetaChip({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon?: LucideIcon;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tabular",
        toneClass[tone],
      )}
    >
      {Icon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
