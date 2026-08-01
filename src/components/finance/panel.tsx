import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Cartão de conteúdo com cabeçalho consistente para gráficos e tabelas. */
export function Panel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold leading-tight sm:text-sm">{title}</h2>
            {description ? (
              <p className="truncate text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </header>
      <div className={cn("p-3 sm:p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
