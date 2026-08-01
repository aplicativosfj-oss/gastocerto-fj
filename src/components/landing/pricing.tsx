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
    description: "Para conhecer o sistema sem pagar nada.",
    highlighted: false,
    cta: "Criar conta grátis",
    features: [
      "Até 30 lançamentos por mês",
      "Categorias, painel e balancete do mês",
      "Inclui 7 dias de teste com tudo liberado",
      "Sem cartão de crédito",
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    monthly: 24.9,
    yearly: 19.9,
    description: "Controle total, previsões e relatórios.",
    highlighted: false,
    cta: "Assinar o Premium",
    features: [
      "Lançamentos e veículos ilimitados",
      "Orçamentos, metas e compromissos",
      "Combustível com custo por km",
      "Exportação em CSV e PDF",
    ],
  },
  {
    slug: "premium_ia",
    name: "Premium IA",
    monthly: 39.9,
    yearly: 33.2,
    description: "Tudo do Premium + Consultor de IA integrado.",
    highlighted: true,
    cta: "Assinar o Premium IA",
    features: [
      "Tudo do plano Premium",
      "Consultor de IA que analisa seus gastos",
      "Créditos mensais de IA inclusos",
      "Recibos e auditoria de cada análise",
    ],
  },
];

const premium = plans[plans.length - 1];
const savingsPercent = Math.round((1 - premium.yearly / premium.monthly) * 100);
const savingsPerYear = premium.monthly * 12 - premium.yearly * 12;


export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const isYearly = cycle === "yearly";
  const [checkoutPlan, setCheckoutPlan] = useState<"premium" | "premium_ia" | null>(null);


  return (
    <section id="planos" className="section-y">
      <div className="section-shell">
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
         <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Planos
          </p>
          <h2 className="section-title mt-1.5">
            Planos para cada nível de controle
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sem fidelidade contratual. Exportação e exclusão de dados disponíveis a qualquer momento.
          </p>
         </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div
            role="group"
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
                aria-pressed={cycle === option.key}
                aria-label={`Cobrança ${option.label.toLowerCase()}`}
                onClick={() => setCycle(option.key)}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
                        ? "bg-brand-foreground text-brand"
                        : "bg-success/15 text-success",
                    )}
                  >
                    -{savingsPercent}%
                  </span>
                )}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="text-[11px] text-muted-foreground">
            {isYearly
              ? `Melhor economia: você poupa ${formatCurrency(savingsPerYear)} por ano no Premium.`
              : `Mude para o anual e economize ${formatCurrency(savingsPerYear)} por ano.`}
          </p>
        </div>

        </div>

        <div className="mx-auto mt-4 grid max-w-5xl gap-3 md:grid-cols-3">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.slug}
                className={cn(
                  "relative flex flex-col rounded-2xl border border-border bg-card/80 p-4 shadow-soft backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lifted",
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

                <ul className="mt-2.5 flex-1 space-y-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[13px]">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3">
                  {plan.monthly === 0 ? (
                    <Button className="h-10 w-full" variant="outline" asChild>
                      <Link to="/auth" search={{ mode: "signup" }}>
                        {plan.cta}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className="h-10 w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                      onClick={() => setCheckoutPlan(plan.slug as "premium" | "premium_ia")}
                    >
                      {plan.cta} · Pix
                    </Button>
                  )}
                  <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                    {plan.monthly === 0
                      ? "Sem cartão. Comece em menos de um minuto."
                      : "Pagamento por Pix com liberação imediata da chave."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CheckoutDialog
        open={checkoutPlan !== null}
        onOpenChange={(open) => setCheckoutPlan(open ? checkoutPlan : null)}
        {...(checkoutPlan ? { initialPlan: checkoutPlan } : {})}
        initialCycle={isYearly ? "annual" : "monthly"}
      />
    </section>
  );
}

