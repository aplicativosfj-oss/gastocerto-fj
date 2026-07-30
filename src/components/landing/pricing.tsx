import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const plans = [
  {
    slug: "free",
    name: "Gratuito",
    price: 0,
    description: "Para começar a organizar hoje mesmo.",
    highlighted: false,
    cta: "Criar conta grátis",
    mode: "signup" as const,
    features: [
      "Registro de despesas e receitas",
      "Painel mensal completo",
      "Categorias e 1 veículo",
      "Relatórios simplificados",
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    price: 19.9,
    description: "Controle total, previsões e relatórios.",
    highlighted: true,
    cta: "Assinar o Premium",
    mode: "signup" as const,
    features: [
      "Lançamentos e veículos ilimitados",
      "Orçamentos, metas e alertas",
      "Combustível com custo por km",
      "Exportação em CSV e PDF",
    ],
  },
];

export function Pricing() {
  return (
    <section id="planos" className="py-12 sm:py-14">
      <div className="section-shell">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Planos
          </p>
          <h2 className="font-display mt-1.5 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
            Comece de graça e evolua quando fizer sentido
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sem fidelidade. Exporte ou exclua seus dados quando quiser.
          </p>
        </div>

        <div className="mx-auto mt-7 grid max-w-3xl gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={cn(
                "relative flex flex-col rounded-2xl border border-border bg-card/80 p-5 shadow-soft backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lifted",
                plan.highlighted && "border-brand/50 ring-1 ring-brand/30",
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-2.5 right-5 gap-1 bg-brand text-brand-foreground">
                  <Sparkles className="size-3" aria-hidden="true" /> Mais completo
                </Badge>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                <p className="tabular text-2xl font-extrabold tracking-tight">
                  {plan.price === 0 ? "R$ 0" : formatCurrency(plan.price)}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">/mês</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  className="sm:flex-1"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link to="/auth" search={{ mode: plan.mode }}>
                    {plan.cta}
                  </Link>
                </Button>
                <Button variant="ghost" className="sm:w-auto" asChild>
                  <Link to="/auth" search={{ mode: "login" }}>
                    Entrar
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
