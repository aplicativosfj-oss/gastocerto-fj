import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type GlyphProps = SVGProps<SVGSVGElement>;

const base = "shrink-0";

/** Chevron descendente com traços finos, usado nos seletores do sistema. */
export function GlyphChevronDown({ className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <path d="M5.5 8 10 12.5 14.5 8" />
    </svg>
  );
}

export function GlyphChevronUp({ className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <path d="M5.5 12 10 7.5 14.5 12" />
    </svg>
  );
}

/** Par de setas (combobox) com aparência editorial. */
export function GlyphSelector({ className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <path d="M6.5 8.25 10 4.75l3.5 3.5" />
      <path d="M13.5 11.75 10 15.25l-3.5-3.5" />
    </svg>
  );
}

/** Check em traço contínuo com leve arredondamento. */
export function GlyphCheck({ className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <path d="m4.75 10.5 3.25 3.25 7.25-7.5" />
    </svg>
  );
}

/** Lupa fina para campos de busca. */
export function GlyphSearch({ className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <circle cx="9" cy="9" r="4.75" />
      <path d="m12.6 12.6 3.15 3.15" />
    </svg>
  );
}

/** Estrela de favorito (contorno ou preenchida). */
export function GlyphStar({
  filled = false,
  className,
  ...props
}: GlyphProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <path d="M10 3.6l1.96 3.97 4.38.64-3.17 3.09.75 4.36L10 13.6l-3.92 2.06.75-4.36L3.66 8.2l4.38-.63L10 3.6Z" />
    </svg>
  );
}

/** Relógio fino usado para itens recentes. */
export function GlyphClock({ className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(base, "size-4", className)}
      {...props}
    >
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.4V10l2.4 1.6" />
    </svg>
  );
}
