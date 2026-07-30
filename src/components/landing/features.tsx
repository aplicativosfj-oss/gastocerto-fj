import {
  BarChart3,
  Car,
  CreditCard,
  Flame,
  LineChart,
  PiggyBank,
  Receipt,
  Repeat,
  ShieldCheck,
  Target,
  Utensils,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Wallet,
    title: "Controle financeiro completo",
    description:
      "Receitas, despesas, contas, carteiras e cartões reunidos em um único painel com visão diária, mensal e anual.",
  },
  {
    icon: Receipt,
    title: "Gastos do dia a dia",
    description:
      "Cadastro rápido em segundos, com categoria, forma de pagamento, comprovante e marcação de gasto essencial.",
  },
  {
    icon: Car,
    title: "Veículos e combustível",
    description:
      "Abastecimentos com preço por litro, odômetro, consumo médio em km/l e custo por quilômetro calculados automaticamente.",
  },
  {
    icon: Flame,
    title: "Gás de cozinha",
    description:
      "Registre a troca do botijão, acompanhe a duração média e receba a previsão da próxima troca.",
  },
  {
    icon: Repeat,
    title: "Contas recorrentes",
    description:
      "Água, energia, internet, aluguel e financiamento com vencimento, status e lançamento automático.",
  },
  {
    icon: CreditCard,
    title: "Mensalidades e assinaturas",
    description:
      "Academia, streaming, cursos e planos de saúde com reajustes, histórico e total anual projetado.",
  },
  {
    icon: Utensils,
    title: "Alimentação e supermercado",
    description:
      "Separe feira, mercado, restaurante e delivery, com média por compra, por semana e por pessoa.",
  },
  {
    icon: PiggyBank,
    title: "Orçamentos",
    description:
      "Limites gerais ou por categoria, com alertas em 50%, 75%, 90% e 100% e projeção de fechamento do mês.",
  },
  {
    icon: Target,
    title: "Metas financeiras",
    description:
      "Reserva de emergência, viagem ou quitação de dívidas com aportes, prazo e previsão de conclusão.",
  },
  {
    icon: BarChart3,
    title: "Relatórios mensais e anuais",
    description:
      "Comparações entre períodos, gastos por categoria e estabelecimento, exportação em PDF e CSV.",
  },
  {
    icon: LineChart,
    title: "Indicadores inteligentes",
    description:
      "Média diária, comparação com o mês anterior, gastos fixos versus variáveis e planejado versus realizado.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e privacidade",
    description:
      "Cada usuário enxerga apenas os próprios dados, com controle individual de acesso e adequação à LGPD.",
  },
];

export function Features() {
  return (
    <section id="recursos" className="py-14 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Recursos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo o que você precisa para organizar sua vida financeira
          </h2>
          <p className="mt-4 text-muted-foreground">
            Do cafezinho ao financiamento do carro: o GastoCerto acompanha cada despesa e transforma
            seus registros em decisões melhores.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted"
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
