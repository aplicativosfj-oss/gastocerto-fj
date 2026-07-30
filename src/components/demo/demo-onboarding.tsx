import { Check, ChevronRight, Compass, Lightbulb } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DemoTab = "visao" | "lancamentos" | "orcamentos" | "combustivel" | "contas";

const steps: {
  tab: DemoTab;
  title: string;
  description: string;
  tip: string;
}[] = [
  {
    tab: "visao",
    title: "Comece pela visão geral",
    description:
      "Os cartões do topo mostram gasto, receitas, saldo e economia do mês. O gráfico diário revela os dias em que você mais gasta.",
    tip: "Dica: compare o mês atual com o anterior para identificar tendências rapidamente.",
  },
  {
    tab: "lancamentos",
    title: "Registre e revise lançamentos",
    description:
      "Cada despesa ou receita entra com data, categoria, valor e comprovante opcional. A lista pode ser filtrada e exportada.",
    tip: "Dica: registre no momento do gasto — leva menos de 10 segundos.",
  },
  {
    tab: "orcamentos",
    title: "Defina orçamentos por categoria",
    description:
      "Você escolhe um limite mensal e acompanha o consumo em barras. Ao passar de 80%, o app avisa.",
    tip: "Dica: comece pelas 3 categorias que mais pesam no seu mês.",
  },
  {
    tab: "combustivel",
    title: "Acompanhe combustível e veículos",
    description:
      "Cada abastecimento calcula consumo médio (km/l), custo por km e valida o odômetro para evitar erros.",
    tip: "Dica: sempre informe o odômetro para o cálculo de consumo ficar preciso.",
  },
  {
    tab: "contas",
    title: "Controle contas recorrentes",
    description:
      "Assinaturas, mensalidades e boletos aparecem com status pago, pendente ou atrasado, com lembretes de vencimento.",
    tip: "Dica: cadastre uma vez e o app gera os próximos lançamentos automaticamente.",
  },
];

export function DemoOnboarding({ onSelectTab }: { onSelectTab: (tab: DemoTab) => void }) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  function goTo(index: number) {
    setCurrent(index);
    onSelectTab(steps[index].tab);
  }

  function next() {
    setDone((value) => (value.includes(current) ? value : [...value, current]));
    if (current < steps.length - 1) goTo(current + 1);
  }

  const step = steps[current];
  const finished = done.length === steps.length;

  return (
    <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <Compass className="size-4" aria-hidden="true" />
          Tour rápido — {steps.length} passos em poucos minutos
        </p>
        <span className="text-xs text-muted-foreground">
          Passo {current + 1} de {steps.length}
        </span>
      </div>

      <ol className="mt-3 flex flex-wrap gap-1.5">
        {steps.map((item, index) => {
          const isDone = done.includes(index);
          const isCurrent = index === current;
          return (
            <li key={item.tab}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isCurrent
                    ? "border-brand bg-brand text-brand-foreground"
                    : isDone
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="grid size-4 place-items-center rounded-full bg-background/25 text-[10px] font-bold">
                  {isDone && !isCurrent ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                {item.title.split(" ").slice(0, 2).join(" ")}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold">
          {current + 1}. {step.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          {step.tip}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={next} disabled={finished && current === steps.length - 1}>
          {current === steps.length - 1 ? "Concluir tour" : "Próximo passo"}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        {current > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => goTo(current - 1)}>
            Voltar
          </Button>
        ) : null}
        {finished ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <Check className="size-3.5" aria-hidden="true" />
            Tour concluído — explore as abas à vontade
          </span>
        ) : null}
      </div>
    </div>
  );
}
