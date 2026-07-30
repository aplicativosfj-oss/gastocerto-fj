/**
 * Tema unificado para gráficos (Recharts) em todo o painel.
 * Todas as cores usam variáveis do design system, garantindo legibilidade
 * automática em modo claro e escuro.
 */

/** Paleta de séries — use sempre nesta ordem para manter consistência visual. */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--acc-6)",
  "var(--acc-3)",
  "var(--acc-5)",
] as const;

/** Cores semânticas fixas por tipo de valor. */
export const CHART_TOKENS = {
  expense: "var(--destructive)",
  income: "var(--success)",
  neutral: "var(--chart-1)",
  warning: "var(--warning)",
  muted: "var(--muted-foreground)",
} as const;

export function seriesColor(index: number) {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/** Tipografia e traços padronizados dos eixos. */
export const axisProps = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  tickLine: false,
  axisLine: false,
  stroke: "var(--border)",
} as const;

export const gridProps = {
  strokeDasharray: "3 3",
  vertical: false,
  stroke: "var(--border)",
} as const;

export const tooltipProps = {
  cursor: { fill: "color-mix(in oklab, var(--muted-foreground) 12%, transparent)" },
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "0 8px 24px oklch(0 0 0 / 12%)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11, marginBottom: 2 },
  itemStyle: { color: "var(--popover-foreground)", fontSize: 12 },
} as const;

export const legendProps = {
  wrapperStyle: { fontSize: 12, color: "var(--muted-foreground)", paddingTop: 8 },
  iconType: "circle" as const,
  iconSize: 8,
};

/** Raio padrão para barras verticais. */
export const barRadius: [number, number, number, number] = [6, 6, 0, 0];
