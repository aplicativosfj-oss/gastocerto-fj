import { BarChart3, ListChecks, Receipt, UserPlus } from "lucide-react";

const tiles = ["var(--acc-1)", "var(--acc-5)", "var(--acc-3)", "var(--acc-2)"];

const steps = [
  {
    icon: UserPlus,
    title: "Crie sua conta",
    description: "Cadastro rápido com nome, e-mail e senha. Sem cartão de crédito.",
  },
  {
    icon: ListChecks,
    title: "Configure suas categorias",
    description: "Comece com categorias prontas e ajuste tudo do jeito que você organiza sua vida.",
  },
  {
    icon: Receipt,
    title: "Registre suas despesas",
    description: "Lançamento rápido no celular, com comprovante, parcelas e contas recorrentes.",
  },
  {
    icon: BarChart3,
    title: "Acompanhe seus resultados",
    description: "Gráficos, orçamentos e alertas mostram exatamente para onde seu dinheiro vai.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-y border-border bg-secondary/40 py-7 sm:py-10">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Como funciona</p>
          <h2 className="mt-1.5 font-display text-[1.6rem] font-bold tracking-[-0.025em] sm:text-[2.1rem]">
            Do primeiro lançamento ao controle total em quatro passos
          </h2>
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="accent-tile relative rounded-2xl p-4"
              style={{ "--tile": tiles[index] } as React.CSSProperties}
            >
              <span className="tabular text-xs font-bold text-muted-foreground">
                Etapa {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className="mt-2 grid size-9 place-items-center rounded-xl"
                style={{
                  color: tiles[index],
                  background: `color-mix(in oklab, ${tiles[index]} 16%, transparent)`,
                }}
              >
                <step.icon className="size-[18px]" aria-hidden="true" />
              </span>
              <h3 className="mt-2.5 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
