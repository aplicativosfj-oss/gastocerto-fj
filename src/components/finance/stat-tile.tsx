import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tones = {
  brand: {
    ring: "border-brand/25",
    glow: "color-mix(in oklab, var(--brand) 16%, transparent)",
    icon: "border-brand/25 bg-brand/12 text-brand",
    value: "text-foreground",
    bar: "bg-brand",
  },
  success: {
    ring: "border-success/25",
    glow: "color-mix(in oklab, var(--success) 16%, transparent)",
    icon: "border-success/30 bg-success/12 text-success",
    value: "text-success",
    bar: "bg-success",
  },
  expense: {
    ring: "border-destructive/25",
    glow: "color-mix(in oklab, var(--destructive) 14%, transparent)",
    icon: "border-destructive/30 bg-destructive/12 text-destructive",
    value: "text-destructive",
    bar: "bg-destructive",
  },
  warning: {
    ring: "border-warning/30",
    glow: "color-mix(in oklab, var(--warning) 18%, transparent)",
    icon: "border-warning/35 bg-warning/14 text-warning",
    value: "text-warning",
    bar: "bg-warning",
  },
  neutral: {
    ring: "border-border",
    glow: "color-mix(in oklab, var(--foreground) 6%, transparent)",
    icon: "border-border bg-muted text-muted-foreground",
    value: "text-foreground",
    bar: "bg-muted-foreground",
  },
} as const;

export type StatTone = keyof typeof tones;

type StatTileProps = {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  /** 0-100: desenha uma barra de proporção no pé do cartão. */
  progress?: number;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/** Cartão de métrica com cor semântica, ícone e proporção opcional. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  progress,
  badge,
  onClick,
  className,
}: StatTileProps) {
  const t = tones[tone];
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border bg-card p-3 text-left shadow-soft transition-all sm:p-4",
        t.ring,
        onClick
          ? "hover:-translate-y-0.5 hover:shadow-lifted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          : null,
        className,
      )}
      style={{ backgroundImage: `linear-gradient(150deg, ${t.glow}, transparent 60%)` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[11.5px]">
          {label}
        </p>
        {Icon ? (
          <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border", t.icon)}>
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1.5 font-display text-[17px] font-bold leading-none tabular sm:text-xl",
          t.value,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">{hint}</p>
      ) : null}
      {badge ? <div className="mt-2">{badge}</div> : null}
      {typeof progress === "number" ? (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", t.bar)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </Comp>
  );
}
