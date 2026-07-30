import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const plans = [
  {
    slug: "free",
    name: "Gratuito",
    price: 0,
    description: "Para começar a organizar suas despesas hoje mesmo.",
    highlighted: false,
    cta: "Começar gratuitamente",
    features: [
      "Registro de despesas",
      "Dashboard mensal",
      "Categorias básicas",
      "Um veículo",
      "Relatórios simplificados",
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    price: 19.9,
    description: "Para quem quer controle completo, previsões e relatórios avançados.",
    highlighted: true,
    cta: "Quero o Premium",
    features: [
      "Lançamentos ilimitados",
      "Veículos ilimitados",
      "Metas financeiras",
      "Relatórios avançados",
      "Exportação em PDF e CSV",
      "Alertas personalizados",
      "Histórico completo",
      "Comparações anuais",
    ],
  },
];

export function Pricing() {
  return (
    <section id="planos" className="py-14 sm:py-16">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand">Planos</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Comece de graça e evolua quando fizer sentido
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sem pegadinhas. Você pode exportar ou excluir seus dados a qualquer momento.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.slug}
              className={cn(
                "relative flex flex-col border-border bg-card shadow-soft transition-all duration-300 hover:shadow-lifted",
                plan.highlighted && "border-brand/50 ring-1 ring-brand/30",
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-6 gap-1 bg-brand text-brand-foreground">
                  <Sparkles className="size-3" aria-hidden="true" /> Mais completo
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <p className="tabular mt-4 text-3xl font-extrabold tracking-tight">
                  {plan.price === 0 ? "R$ 0,00" : formatCurrency(plan.price)}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">/mês</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <a href="#inicio">{plan.cta}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
