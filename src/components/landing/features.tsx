import {
  BarChart3,
  Bike,
  Car,
  ChefHat,
  CreditCard,
  Droplet,
  Dumbbell,
  Flame,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  LineChart,
  MonitorPlay,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShieldCheck,
  ShoppingCart,
  Target,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Wallet,
    tile: "var(--acc-1)",
    title: "Controle financeiro completo",
    description: "Receitas, despesas, contas e cartões com visão diária, mensal e anual.",
  },
  {
    icon: Receipt,
    tile: "var(--acc-5)",
    title: "Gastos do dia a dia",
    description: "Cadastro em segundos com categoria, pagamento e comprovante anexado.",
  },
  {
    icon: Car,
    tile: "var(--acc-4)",
    title: "Veículos e combustível",
    description: "Odômetro, consumo em km/l e custo por quilômetro calculados sozinhos.",
  },
  {
    icon: Flame,
    tile: "var(--acc-3)",
    title: "Gás de cozinha",
    description: "Troca do botijão, duração média e previsão da próxima recarga.",
  },
  {
    icon: Repeat,
    tile: "var(--acc-6)",
    title: "Contas recorrentes",
    description: "Água, energia, internet e aluguel com vencimento, status e automação.",
  },
  {
    icon: CreditCard,
    tile: "var(--acc-5)",
    title: "Mensalidades e streaming",
    description: "Academia, Netflix, cursos e planos com histórico e total anual.",
  },
  {
    icon: Utensils,
    tile: "var(--acc-3)",
    title: "Alimentação",
    description: "Feira, mercado, restaurante e delivery com média por compra e semana.",
  },
  {
    icon: PiggyBank,
    tile: "var(--acc-2)",
    title: "Orçamentos",
    description: "Limites por categoria com alertas em 50%, 75%, 90% e 100%.",
  },
  {
    icon: Target,
    tile: "var(--acc-1)",
    title: "Metas financeiras",
    description: "Reserva, viagem ou quitação de dívidas com aportes e prazo.",
  },
  {
    icon: BarChart3,
    tile: "var(--acc-6)",
    title: "Relatórios PDF e CSV",
    description: "Comparações entre períodos e gastos por categoria prontos para exportar.",
  },
  {
    icon: LineChart,
    tile: "var(--acc-2)",
    title: "Indicadores inteligentes",
    description: "Média diária, fixos versus variáveis e planejado versus realizado.",
  },
  {
    icon: ShieldCheck,
    tile: "var(--acc-4)",
    title: "Segurança e LGPD",
    description: "Cada usuário enxerga apenas os próprios dados, com acesso individual.",
  },
];

const categories = [
  { icon: Flame, label: "Gás", color: "#f59e0b" },
  { icon: Fuel, label: "Combustível", color: "#ef4444" },
  { icon: Utensils, label: "Alimentação", color: "#f97316" },
  { icon: ShoppingCart, label: "Supermercado", color: "#16a34a" },
  { icon: ChefHat, label: "Restaurantes", color: "#fb7185" },
  { icon: Bike, label: "Delivery", color: "#f43f5e" },
  { icon: Shirt, label: "Roupas", color: "#0d9488" },
  { icon: Dumbbell, label: "Academia", color: "#84cc16" },
  { icon: MonitorPlay, label: "Streaming", color: "#a21caf" },
  { icon: Home, label: "Moradia", color: "#3b82f6" },
  { icon: Zap, label: "Energia", color: "#eab308" },
  { icon: Droplet, label: "Água", color: "#0ea5e9" },
  { icon: HeartPulse, label: "Saúde", color: "#ec4899" },
  { icon: GraduationCap, label: "Educação", color: "#0891b2" },
  { icon: Gift, label: "Presentes", color: "#db2777" },
  { icon: PawPrint, label: "Pets", color: "#d97706" },
  { icon: Plane, label: "Viagens", color: "#059669" },
  { icon: Car, label: "Veículos", color: "#475569" },
];

export function Features() {
  return (
    <section id="recursos" className="py-9 sm:py-11">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Recursos</p>
          <h2 className="mt-1.5 font-display text-[1.6rem] font-bold tracking-[-0.025em] sm:text-[2.1rem]">
            Tudo o que você precisa em{" "}
            <span className="text-gradient">um só painel</span>
          </h2>
          <p className="mt-2.5 text-sm text-muted-foreground sm:text-base">
            Do cafezinho ao financiamento do carro — cada despesa registrada vira decisão melhor.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="accent-tile rounded-2xl p-3.5"
              style={{ "--tile": feature.tile } as React.CSSProperties}
            >
              <span
                className="grid size-9 place-items-center rounded-xl"
                style={{
                  color: feature.tile,
                  background: `color-mix(in oklab, ${feature.tile} 16%, transparent)`,
                }}
              >
                <feature.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <h3 className="mt-2.5 text-sm font-semibold leading-snug">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4 shadow-soft backdrop-blur">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-base font-semibold">
              Categorias prontas desde o primeiro acesso
            </h3>
            <p className="text-xs text-muted-foreground">
              Você ainda pode criar, editar e colorir as suas próprias.
            </p>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <li
                key={category.label}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{
                  color: category.color,
                  borderColor: `color-mix(in oklab, ${category.color} 32%, transparent)`,
                  background: `color-mix(in oklab, ${category.color} 10%, transparent)`,
                }}
              >
                <category.icon className="size-3.5" aria-hidden="true" />
                {category.label}
              </li>
            ))}
            <li className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              + criar categoria
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
