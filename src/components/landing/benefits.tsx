import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  Fuel,
  LineChart,
  PiggyBank,
  Target,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: PiggyBank,
    title: "Economize sem planilha",
    description:
      "O painel mostra onde o dinheiro escapa e sugere onde cortar primeiro, sem fórmula manual.",
    metric: "R$ 640/mês",
    metricHint: "economia média após 90 dias",
  },
  {
    icon: Timer,
    title: "Menos tempo lançando",
    description:
      "Lançamento rápido, contas recorrentes automáticas e comprovantes anexados em segundos.",
    metric: "3 min/dia",
    metricHint: "para manter tudo em dia",
  },
  {
    icon: Target,
    title: "Orçamento que avisa antes",
    description:
      "Defina limites por categoria e receba alertas quando o consumo passar da sua tolerância.",
    metric: "80% do limite",
    metricHint: "alerta antes de estourar",
  },
  {
    icon: Fuel,
    title: "Combustível sob controle",
    description:
      "Consumo km/l, custo por km e auditoria de odômetro calculados a cada abastecimento.",
    metric: "R$ 0,52/km",
    metricHint: "custo real do seu veículo",
  },
  {
    icon: LineChart,
    title: "Decisões com dados",
    description:
      "Relatórios mensais comparam períodos e mostram tendência de gasto por categoria.",
    metric: "12 meses",
    metricHint: "de histórico comparável",
  },
  {
    icon: BellRing,
    title: "Nada vence esquecido",
    description:
      "Status de pago, pendente e atrasado atualizados automaticamente nas contas recorrentes.",
    metric: "0 juros",
    metricHint: "por conta esquecida",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="py-7 sm:py-10">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Benefícios</p>
          <h2 className="mt-2 font-display text-[1.5rem] font-bold tracking-[-0.025em] sm:text-[2rem] lg:text-4xl">
            Gestão de gastos que devolve dinheiro e tempo
          </h2>
          <p className="mt-4 text-muted-foreground">
            Não é só registrar despesa: o GastoCerto transforma cada lançamento em indicador,
            alerta e decisão.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lifted"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand/12 text-brand">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <div className="mt-4 border-t border-border pt-3">
                <p className="tabular font-display text-lg font-bold text-foreground">
                  {item.metric}
                </p>
                <p className="text-xs text-muted-foreground">{item.metricHint}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="shadow-soft" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Criar conta gratuita
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/demonstracao">Ver demonstração</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
