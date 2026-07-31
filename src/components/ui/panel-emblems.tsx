import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

type EmblemProps = SVGProps<SVGSVGElement> & { title?: string };

const shell =
  "shrink-0 rounded-xl border border-border/60 bg-[oklch(1_0_0/0.04)] p-1.5 shadow-[0_1px_0_oklch(1_0_0/0.06)_inset]";

function Frame({
  className,
  title,
  children,
  ...props
}: EmblemProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      className={cn(shell, "size-9", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Emblema do Consultor de IA: núcleo com órbitas e faíscas. */
export function EmblemAdvisor(props: EmblemProps) {
  return (
    <Frame {...props}>
      <defs>
        <linearGradient id="em-advisor" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="oklch(0.78 0.16 160)" />
          <stop offset="100%" stopColor="oklch(0.62 0.14 210)" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="5.5" fill="url(#em-advisor)" opacity="0.9" />
      <ellipse
        cx="20"
        cy="20"
        rx="14"
        ry="7"
        stroke="url(#em-advisor)"
        strokeWidth="1.4"
        opacity="0.7"
      />
      <ellipse
        cx="20"
        cy="20"
        rx="7"
        ry="14"
        stroke="url(#em-advisor)"
        strokeWidth="1.4"
        opacity="0.45"
      />
      <path
        d="M31 8.5l1.1 2.4 2.4 1.1-2.4 1.1L31 15.5l-1.1-2.4-2.4-1.1 2.4-1.1z"
        fill="url(#em-advisor)"
      />
    </Frame>
  );
}

/** Emblema de medição/créditos: mostrador com ponteiro. */
export function EmblemGauge(props: EmblemProps) {
  return (
    <Frame {...props}>
      <defs>
        <linearGradient id="em-gauge" x1="0" y1="40" x2="40" y2="0">
          <stop offset="0%" stopColor="oklch(0.72 0.16 160)" />
          <stop offset="100%" stopColor="oklch(0.82 0.15 100)" />
        </linearGradient>
      </defs>
      <path
        d="M7 27a13 13 0 1 1 26 0"
        stroke="oklch(0.6 0.02 250 / 0.35)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M7 27A13 13 0 0 1 18 14.2"
        stroke="url(#em-gauge)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M20 27l7-8" stroke="url(#em-gauge)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="27" r="2.2" fill="url(#em-gauge)" />
    </Frame>
  );
}

/** Emblema de recibo/auditoria: folha serrilhada com linhas. */
export function EmblemReceipt(props: EmblemProps) {
  return (
    <Frame {...props}>
      <defs>
        <linearGradient id="em-receipt" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="oklch(0.7 0.12 250)" />
          <stop offset="100%" stopColor="oklch(0.72 0.16 160)" />
        </linearGradient>
      </defs>
      <path
        d="M11 7h18v22.5l-3 2-3-2-3 2-3-2-3 2-3-2z"
        stroke="url(#em-receipt)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="oklch(0.72 0.16 160 / 0.07)"
      />
      <path
        d="M15 14h10M15 19h10M15 24h6"
        stroke="url(#em-receipt)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Frame>
  );
}

/** Emblema de escudo/administração. */
export function EmblemShield(props: EmblemProps) {
  return (
    <Frame {...props}>
      <defs>
        <linearGradient id="em-shield" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="oklch(0.7 0.14 265)" />
          <stop offset="100%" stopColor="oklch(0.72 0.16 160)" />
        </linearGradient>
      </defs>
      <path
        d="M20 6l11 4v9c0 7-4.6 12.2-11 15-6.4-2.8-11-8-11-15v-9z"
        stroke="url(#em-shield)"
        strokeWidth="1.6"
        fill="oklch(0.7 0.14 265 / 0.08)"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 20.5l4 4 7.5-8"
        stroke="url(#em-shield)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

/** Emblema de alerta gradiente para avisos de crédito baixo. */
export function EmblemAlert(props: EmblemProps) {
  return (
    <Frame {...props}>
      <defs>
        <linearGradient id="em-alert" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="oklch(0.82 0.16 85)" />
          <stop offset="100%" stopColor="oklch(0.68 0.19 30)" />
        </linearGradient>
      </defs>
      <path
        d="M20 8.5l12 21H8z"
        stroke="url(#em-alert)"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="oklch(0.82 0.16 85 / 0.1)"
      />
      <path d="M20 16.5v6.5" stroke="url(#em-alert)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="20" cy="26" r="1.4" fill="url(#em-alert)" />
    </Frame>
  );
}
