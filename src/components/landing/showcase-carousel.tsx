import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Fuel,
  ListChecks,
  PiggyBank,
  Repeat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Shot = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  render: () => React.ReactNode;
};

function ShotFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/95 shadow-lifted backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="size-2 rounded-full bg-destructive/60" />
        <span className="size-2 rounded-full bg-warning/60" />
        <span className="size-2 rounded-full bg-success/60" />
        <span className="ml-2 truncate text-[10px] text-muted-foreground">
          app.gastocerto.com
        </span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-0.5 text-sm font-bold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

const bars = [38, 62, 44, 88, 51, 73, 40, 95, 58, 66, 34, 79];

const shots: Shot[] = [
  {
    id: "painel",
    title: "Painel mensal",
    description: "Gasto, saldo e evolução diária em uma tela só.",
    icon: BarChart3,
    render: () => (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Gasto no mês" value={formatCurrency(3782.45)} tone="negative" />
          <Stat label="Saldo" value={formatCurrency(2417.55)} tone="positive" />
          <Stat label="Disponível" value={formatCurrency(1217.55)} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] font-medium">Despesas por dia</p>
          <div className="mt-2 flex h-24 items-end gap-1" aria-hidden="true">
            {bars.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t bg-gradient-to-t from-brand/60 to-brand"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "lancamentos",
    title: "Lançamentos",
    description: "Filtre, categorize e anexe comprovantes.",
    icon: ListChecks,
    render: () => (
      <ul className="space-y-1.5">
        {[
          { name: "Supermercado Dia", cat: "Mercado", value: -186.32 },
          { name: "Posto Ipiranga", cat: "Combustível", value: -212.4 },
          { name: "Salário", cat: "Receita", value: 4800 },
          { name: "Internet fibra", cat: "Contas", value: -119.9 },
          { name: "Farmácia", cat: "Saúde", value: -78.5 },
          { name: "Academia", cat: "Assinaturas", value: -89.9 },
        ].map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-2 text-[11px]"
          >
            <span className="truncate">
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground"> · {row.cat}</span>
            </span>
            <span
              className={cn(
                "tabular font-semibold",
                row.value > 0 ? "text-success" : "text-foreground",
              )}
            >
              {formatCurrency(row.value)}
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "combustivel",
    title: "Combustível",
    description: "Consumo médio, custo por km e alertas.",
    icon: Fuel,
    render: () => (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Consumo médio" value="11,8 km/l" tone="positive" />
          <Stat label="Custo por km" value={formatCurrency(0.51)} />
          <Stat label="Preço médio" value={`${formatCurrency(5.89)}/L`} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] font-medium">Abastecimentos</p>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            {[
              { d: "28/07", l: "42,1 L", v: 248.0, km: "11,4 km/l" },
              { d: "14/07", l: "38,6 L", v: 227.3, km: "12,1 km/l" },
              { d: "01/07", l: "40,2 L", v: 236.8, km: "11,9 km/l" },
            ].map((row) => (
              <li key={row.d} className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {row.d} · {row.l} · {row.km}
                </span>
                <span className="tabular font-semibold">{formatCurrency(row.v)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "orcamentos",
    title: "Orçamentos",
    description: "Limites por categoria com alerta de estouro.",
    icon: PiggyBank,
    render: () => (
      <ul className="space-y-2.5">
        {[
          { name: "Alimentação", used: 1284.9, limit: 1500, pct: 86 },
          { name: "Combustível", used: 742.3, limit: 900, pct: 82 },
          { name: "Lazer", used: 318.0, limit: 600, pct: 53 },
          { name: "Assinaturas", used: 189.7, limit: 200, pct: 95 },
        ].map((row) => (
          <li key={row.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium">{row.name}</span>
              <span className="tabular text-muted-foreground">
                {formatCurrency(row.used)} / {formatCurrency(row.limit)}
              </span>
            </div>
            <Progress value={row.pct} className="h-1.5" />
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "recorrencia",
    title: "Contas recorrentes",
    description: "Vencimentos, status e lançamento automático.",
    icon: Repeat,
    render: () => (
      <ul className="space-y-1.5">
        {[
          { name: "Aluguel", date: "05/08", value: 1450, status: "Pendente" },
          { name: "Energia", date: "07/08", value: 218.4, status: "Pendente" },
          { name: "Internet", date: "02/08", value: 119.9, status: "Pago" },
          { name: "Gás (13 kg)", date: "30/07", value: 112.0, status: "Atrasado" },
          { name: "Streaming", date: "12/08", value: 55.9, status: "Pendente" },
        ].map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-2 text-[11px]"
          >
            <span>
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground"> · vence {row.date}</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "h-5 border-border px-1.5 text-[9px]",
                  row.status === "Pago" && "border-success/40 text-success",
                  row.status === "Atrasado" && "border-destructive/40 text-destructive",
                )}
              >
                {row.status}
              </Badge>
              <span className="tabular font-semibold">{formatCurrency(row.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
];

export function ShowcaseCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section id="produto" className="py-9 sm:py-11">
      <div className="section-shell">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Por dentro do produto
          </p>
          <h2 className="font-display mt-1.5 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            Veja as telas antes de criar sua conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Um passeio rápido pelas principais telas do GastoCerto, com dados de exemplo.
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-3xl">
          <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
            <CarouselContent>
              {shots.map((shot) => (
                <CarouselItem key={shot.id}>
                  <div className="px-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-brand/12 text-brand">
                        <shot.icon className="size-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{shot.title}</p>
                        <p className="text-xs text-muted-foreground">{shot.description}</p>
                      </div>
                    </div>
                    <ShotFrame>{shot.render()}</ShotFrame>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>

          <div className="mt-4 flex items-center justify-center gap-2">
            {shots.map((shot, index) => (
              <button
                key={shot.id}
                type="button"
                aria-label={`Ver ${shot.title}`}
                aria-current={index === current}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === current ? "w-6 bg-brand" : "w-1.5 bg-border hover:bg-brand/40",
                )}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button asChild className="shadow-soft">
              <Link to="/demonstracao">
                Abrir demonstração completa
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar conta grátis
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
