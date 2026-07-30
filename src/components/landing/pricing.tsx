import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "yearly";

const plans = [
  {
    slug: "free",
    name: "Gratuito",
    monthly: 0,
    yearly: 0,
    description: "Para começar a organizar hoje mesmo.",
    highlighted: false,
    cta: "Criar conta grátis",
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
    monthly: 19.9,
    yearly: 15.9,
    description: "Controle total, previsões e relatórios.",
    highlighted: true,
    cta: "Assinar o Premium",
    features: [
      "Lançamentos e veículos ilimitados",
      "Orçamentos, metas e alertas",
      "Combustível com custo por km",
      "Exportação em CSV e PDF",
    ],
  },
];

const premium = plans[1];
const savingsPercent = Math.round((1 - premium.yearly / premium.monthly) * 100);
const savingsPerYear = premium.monthly * 12 - premium.yearly * 12;

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const isYearly = cycle === "yearly";

  return (
    <section id="planos" className="section-y">
      <div className="section-shell">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Planos
          </p>
          <h2 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-[-0.025em] sm:text-[1.75rem] lg:text-3xl">
            Comece de graça e evolua quando fizer sentido
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sem fidelidade. Exporte ou exclua seus dados quando quiser.
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <div
            role="tablist"
            aria-label="Ciclo de cobrança"
            className="inline-flex items-center rounded-full border border-border bg-card/80 p-1 shadow-soft backdrop-blur-sm"
          >
            {(
              [
                { key: "monthly" as const, label: "Mensal" },
                { key: "yearly" as const, label: "Anual" },
              ]
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={cycle === option.key}
                onClick={() => setCycle(option.key)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  cycle === option.key
                    ? "bg-brand text-brand-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
                {option.key === "yearly" && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                      cycle === "yearly"
                        ? "bg-brand-foreground/15 text-brand-foreground"
                        : "bg-success/15 text-success",
                    )}
                  >
                    -{savingsPercent}%
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isYearly
              ? `Melhor economia: você poupa ${formatCurrency(savingsPerYear)} por ano no Premium.`
              : `Mude para o anual e economize ${formatCurrency(savingsPerYear)} por ano.`}
          </p>
        </div>

        <div className="mx-auto mt-7 grid max-w-3xl gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.slug}
                className={cn(
                  "relative flex flex-col rounded-2xl border border-border bg-card/80 p-5 shadow-soft backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lifted",
                  plan.highlighted && "border-brand/50 ring-1 ring-brand/30",
                )}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-2.5 right-5 gap-1 bg-brand text-brand-foreground">
                    <Sparkles className="size-3" aria-hidden="true" />
                    {isYearly ? "Melhor economia" : "Mais completo"}
                  </Badge>
                )}

                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  <p className="tabular text-2xl font-extrabold tracking-tight">
                    {price === 0 ? "R$ 0" : formatCurrency(price)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">/mês</span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.description}
                  {plan.monthly > 0 && isYearly && (
                    <>
                      {" "}
                      <span className="text-success">
                        Cobrado {formatCurrency(plan.yearly * 12)} por ano.
                      </span>
                    </>
                  )}
                </p>

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
                    <Link to="/auth" search={{ mode: "signup" }}>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
