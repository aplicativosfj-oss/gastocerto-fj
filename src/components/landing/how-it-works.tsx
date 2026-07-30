import { BarChart3, ListChecks, Receipt, UserPlus } from "lucide-react";

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
    <section id="como-funciona" className="border-y border-border bg-secondary/40 py-14 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Como funciona</p>
          <h2 className="mt-2 font-display text-[1.75rem] font-bold tracking-[-0.025em] sm:text-4xl">
            Do primeiro lançamento ao controle total em quatro passos
          </h2>
        </div>

        <ol className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-soft transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="tabular text-xs font-bold text-muted-foreground">
                Etapa {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-3 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
