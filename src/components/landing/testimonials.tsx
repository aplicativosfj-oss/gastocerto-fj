import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Marina Alves",
    role: "Analista de marketing · São Paulo",
    initials: "MA",
    quote:
      "Em dois meses descobri R$ 780 por mês em assinaturas e delivery que eu nem lembrava. Hoje meu orçamento fecha certo.",
    highlight: "R$ 780/mês recuperados",
  },
  {
    name: "Rafael Nunes",
    role: "Motorista de aplicativo · Curitiba",
    initials: "RN",
    quote:
      "O controle de combustível mudou meu trabalho. Sei o custo por km de cada carro e consigo saber se o dia foi lucrativo.",
    highlight: "Custo por km em tempo real",
  },
  {
    name: "Juliana Prado",
    role: "Dentista · Belo Horizonte",
    initials: "JP",
    quote:
      "As contas recorrentes com aviso de vencimento acabaram com os juros por esquecimento. Simples e direto ao ponto.",
    highlight: "Nenhuma conta atrasada",
  },
];

export function Testimonials() {
  return (
    <section id="depoimentos" className="border-y border-border bg-secondary/40 py-14 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Depoimentos</p>
          <h2 className="mt-2 font-display text-[1.75rem] font-bold tracking-[-0.025em] sm:text-4xl">
            Quem controla os gastos com o GastoCerto
          </h2>
          <p className="mt-4 text-muted-foreground">
            Histórias de quem trocou a planilha por um painel financeiro completo.
          </p>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <figure
              key={item.name}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 text-warning" aria-label="5 de 5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <Quote className="size-5 text-brand/40" aria-hidden="true" />
              </div>

              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                “{item.quote}”
              </blockquote>

              <p className="mt-4 inline-flex w-fit rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success">
                {item.highlight}
              </p>

              <figcaption className="mt-5 flex min-w-0 items-center gap-3 border-t border-border pt-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
