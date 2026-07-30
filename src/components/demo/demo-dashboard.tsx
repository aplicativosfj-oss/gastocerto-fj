import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Fuel,
  PiggyBank,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const dailySeries = Array.from({ length: 30 }, (_, index) => {
  const base = [96, 42, 58, 120, 33, 71, 145, 60, 88, 39][index % 10];
  return { dia: String(index + 1).padStart(2, "0"), gasto: base + (index % 5) * 12 };
});

const monthlySeries = [
  { mes: "Fev", receita: 5200, despesa: 4120 },
  { mes: "Mar", receita: 5200, despesa: 4480 },
  { mes: "Abr", receita: 5650, despesa: 3980 },
  { mes: "Mai", receita: 5200, despesa: 4310 },
  { mes: "Jun", receita: 5800, despesa: 4118 },
  { mes: "Jul", receita: 6200, despesa: 3782 },
];

const categories = [
  { name: "Alimentação", value: 1284.9, color: "var(--brand)" },
  { name: "Combustível", value: 742.3, color: "var(--success)" },
  { name: "Mercado", value: 618.75, color: "var(--warning)" },
  { name: "Contas", value: 546.1, color: "var(--accent)" },
  { name: "Outros", value: 590.4, color: "var(--muted-foreground)" },
];

const transactions = [
  { d: "29/07", name: "Posto Ipiranga", cat: "Combustível", value: -212.4 },
  { d: "28/07", name: "Salário", cat: "Receita", value: 4800 },
  { d: "27/07", name: "Supermercado Dia", cat: "Mercado", value: -186.32 },
  { d: "26/07", name: "Restaurante Sabor", cat: "Alimentação", value: -74.9 },
  { d: "25/07", name: "Internet fibra", cat: "Contas", value: -119.9 },
  { d: "24/07", name: "Freelance design", cat: "Receita", value: 1400 },
  { d: "23/07", name: "Farmácia São João", cat: "Saúde", value: -78.5 },
  { d: "22/07", name: "Gás 13 kg", cat: "Casa", value: -112.0 },
];

const budgets = [
  { name: "Alimentação", used: 1284.9, limit: 1500 },
  { name: "Combustível", used: 742.3, limit: 900 },
  { name: "Mercado", used: 618.75, limit: 700 },
  { name: "Lazer", used: 318.0, limit: 600 },
  { name: "Assinaturas", used: 189.7, limit: 200 },
];

const fuelEntries = [
  { d: "28/07", litros: 42.1, valor: 248.0, km: 11.4, odometro: 48210 },
  { d: "14/07", litros: 38.6, valor: 227.3, km: 12.1, odometro: 47730 },
  { d: "01/07", litros: 40.2, valor: 236.8, km: 11.9, odometro: 47263 },
  { d: "18/06", litros: 41.5, valor: 243.4, km: 11.2, odometro: 46785 },
];

const bills = [
  { name: "Aluguel", date: "05/08", value: 1450, status: "Pendente" },
  { name: "Energia elétrica", date: "07/08", value: 218.4, status: "Pendente" },
  { name: "Internet fibra", date: "02/08", value: 119.9, status: "Pago" },
  { name: "Gás encanado", date: "30/07", value: 112.0, status: "Atrasado" },
  { name: "Academia", date: "08/08", value: 89.9, status: "Pendente" },
  { name: "Streaming", date: "12/08", value: 55.9, status: "Pendente" },
];

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border bg-card/90 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-brand" aria-hidden="true" />
      </div>
      <p
        className={cn(
          "tabular mt-1.5 text-xl font-bold tracking-tight",
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

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/90 p-4 shadow-soft backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.6rem",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

export function DemoDashboard() {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-3 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Julho de 2026 · conta de exemplo</p>
          <p className="font-display text-lg font-bold tracking-tight">Olá, Marina</p>
        </div>
        <Badge variant="outline" className="border-brand/40 text-brand">
          Dados fictícios
        </Badge>
      </div>

      <Tabs defaultValue="visao" className="mt-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="combustivel">Combustível</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Gasto no mês"
              value={formatCurrency(3782.45)}
              hint="8,2% menor que junho"
              icon={Wallet}
              tone="negative"
            />
            <KpiCard
              label="Receitas"
              value={formatCurrency(6200)}
              hint="Salário + freelances"
              icon={ArrowUpRight}
              tone="positive"
            />
            <KpiCard
              label="Saldo do mês"
              value={formatCurrency(2417.55)}
              hint="Economia de 39%"
              icon={PiggyBank}
              tone="positive"
            />
            <KpiCard
              label="A vencer"
              value={formatCurrency(1934.1)}
              hint="6 contas nos próximos 15 dias"
              icon={CalendarClock}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <Panel title="Despesas por dia">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ left: -18, right: 6, top: 6 }}>
                    <defs>
                      <linearGradient id="demoArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [formatCurrency(value), "Gasto"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="gasto"
                      stroke="var(--brand)"
                      strokeWidth={2}
                      fill="url(#demoArea)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Onde o dinheiro foi">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {categories.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {categories.map((cat) => (
                  <li key={cat.name} className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: cat.color }}
                        aria-hidden="true"
                      />
                      {cat.name}
                    </span>
                    <span className="tabular text-muted-foreground">
                      {formatCurrency(cat.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Panel title="Receitas x despesas nos últimos 6 meses">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries} margin={{ left: -18, right: 6, top: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="receita" fill="var(--success)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="despesa" fill="var(--brand)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="lancamentos" className="mt-4">
          <Panel
            title="Últimos lançamentos"
            action={<span className="text-xs text-muted-foreground">8 de 142 no mês</span>}
          >
            <ul className="divide-y divide-border">
              {transactions.map((row) => (
                <li key={`${row.d}-${row.name}`} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-lg",
                        row.value > 0
                          ? "bg-success/12 text-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {row.value > 0 ? (
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{row.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.d} · {row.cat}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "tabular text-sm font-semibold",
                      row.value > 0 ? "text-success" : "text-foreground",
                    )}
                  >
                    {formatCurrency(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="orcamentos" className="mt-4 space-y-3">
          <Panel title="Orçamentos por categoria">
            <ul className="space-y-3.5">
              {budgets.map((row) => {
                const pct = Math.round((row.used / row.limit) * 100);
                return (
                  <li key={row.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{row.name}</span>
                      <span className="tabular text-muted-foreground">
                        {formatCurrency(row.used)} de {formatCurrency(row.limit)} · {pct}%
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-2" />
                    {pct >= 90 && (
                      <p className="inline-flex items-center gap-1 text-[11px] text-warning">
                        <AlertTriangle className="size-3" aria-hidden="true" />
                        Perto do limite definido
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="combustivel" className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Consumo médio" value="11,8 km/l" icon={Fuel} tone="positive" />
            <KpiCard label="Custo por km" value={formatCurrency(0.51)} icon={Wallet} />
            <KpiCard
              label="Gasto no mês"
              value={formatCurrency(742.3)}
              hint="2 abastecimentos"
              icon={ArrowDownRight}
              tone="negative"
            />
          </div>
          <Panel title="Abastecimentos — Onix 1.0 (Marina)">
            <ul className="divide-y divide-border">
              {fuelEntries.map((row) => (
                <li key={row.d} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <span className="block font-medium">{row.d}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {row.litros} L · odômetro {row.odometro.toLocaleString("pt-BR")} km
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="tabular block font-semibold">{formatCurrency(row.valor)}</span>
                    <span className="tabular block text-[11px] text-muted-foreground">
                      {row.km.toFixed(1)} km/l
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="contas" className="mt-4">
          <Panel title="Contas e assinaturas recorrentes">
            <ul className="divide-y divide-border">
              {bills.map((row) => (
                <li key={row.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Vence em {row.date}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-border text-[10px]",
                        row.status === "Pago" && "border-success/40 text-success",
                        row.status === "Atrasado" && "border-destructive/40 text-destructive",
                        row.status === "Pendente" && "border-warning/40 text-warning",
                      )}
                    >
                      {row.status}
                    </Badge>
                    <span className="tabular font-semibold">{formatCurrency(row.value)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
