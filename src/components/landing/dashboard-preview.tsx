import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Fuel,
  ShoppingCart,
  Utensils,
  Zap,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartBars = [
  { day: "01", value: 42 },
  { day: "05", value: 68 },
  { day: "09", value: 35 },
  { day: "12", value: 82 },
  { day: "15", value: 54 },
  { day: "19", value: 96 },
  { day: "22", value: 61 },
  { day: "26", value: 74 },
  { day: "29", value: 48 },
];

const topCategories = [
  { name: "Alimentação", value: 1284.9, percent: 34, icon: Utensils },
  { name: "Combustível", value: 742.3, percent: 20, icon: Fuel },
  { name: "Supermercado", value: 618.75, percent: 16, icon: ShoppingCart },
  { name: "Energia", value: 289.4, percent: 8, icon: Zap },
];

const upcomingBills = [
  { name: "Internet fibra", date: "2026-08-05", value: 119.9 },
  { name: "Academia", date: "2026-08-08", value: 89.9 },
  { name: "Financiamento", date: "2026-08-10", value: 742.0 },
];

const lastEntries = [
  { name: "Posto Ipiranga", category: "Combustível", value: -212.4, date: "2026-07-29" },
  { name: "Salário", category: "Receita", value: 4800, date: "2026-07-28" },
  { name: "Supermercado Dia", category: "Supermercado", value: -186.32, date: "2026-07-27" },
];

function PreviewCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-base font-bold tracking-tight",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Prévia do painel do GastoCerto com total gasto no mês, saldo, orçamento, gráfico de despesas, categorias, abastecimentos, próximas contas e últimos lançamentos"
      className="rounded-2xl border border-border bg-card p-4 shadow-lifted"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Julho de 2026</p>
          <p className="text-sm font-semibold">Olá, Marina</p>
        </div>
        <span className="relative grid size-8 place-items-center rounded-lg border border-border">
          <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-destructive" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <PreviewCard label="Gasto no mês" value={formatCurrency(3782.45)} tone="negative" />
        <PreviewCard label="Saldo atual" value={formatCurrency(2417.55)} tone="positive" />
        <PreviewCard label="Disponível" value={formatCurrency(1217.55)} hint="Orçamento" />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Despesas por dia</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <ArrowDownRight className="size-3" aria-hidden="true" /> 8,2% vs. junho
          </span>
        </div>
        <div className="mt-3 flex h-24 items-end gap-1.5" aria-hidden="true">
          {chartBars.map((bar) => (
            <div key={bar.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-brand/85"
                style={{ height: `${bar.value}%` }}
              />
              <span className="text-[9px] text-muted-foreground">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs font-medium">Maiores categorias</p>
          <ul className="mt-2 space-y-2">
            {topCategories.map((cat) => (
              <li key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <cat.icon className="size-3.5 text-brand" aria-hidden="true" />
                    {cat.name}
                  </span>
                  <span className="tabular text-muted-foreground">{formatCurrency(cat.value)}</span>
                </div>
                <Progress value={cat.percent} className="h-1.5" />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-medium">Abastecimentos recentes</p>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Consumo médio</span>
              <span className="tabular font-semibold">11,8 km/l</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Preço médio</span>
              <span className="tabular font-semibold">{formatCurrency(5.89)}/L</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-medium">Próximas contas</p>
            <ul className="mt-2 space-y-1.5">
              {upcomingBills.map((bill) => (
                <li key={bill.name} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {bill.name} · {formatDate(bill.date)}
                  </span>
                  <span className="tabular font-semibold">{formatCurrency(bill.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Últimos lançamentos</p>
          <span className="text-[11px] text-muted-foreground">
            Orçamento consumido {formatPercent(68)}
          </span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {lastEntries.map((entry) => (
            <li key={entry.name} className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                {entry.value > 0 ? (
                  <ArrowUpRight className="size-3.5 text-success" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="size-3.5 text-destructive" aria-hidden="true" />
                )}
                <span className="font-medium">{entry.name}</span>
                <span className="text-muted-foreground">· {entry.category}</span>
              </span>
              <span
                className={cn(
                  "tabular font-semibold",
                  entry.value > 0 ? "text-success" : "text-foreground",
                )}
              >
                {formatCurrency(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
