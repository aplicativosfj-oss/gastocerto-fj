import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "O sistema é gratuito?",
    answer:
      "Sim. O plano Gratuito permite registrar despesas, acompanhar o dashboard mensal, usar categorias básicas, cadastrar um veículo e ver relatórios simplificados. O plano Premium é opcional.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "Sim. Cada conta acessa apenas os próprios registros, com regras de segurança aplicadas diretamente no banco de dados. As senhas são gerenciadas pelo provedor de autenticação.",
  },
  {
    question: "Posso cadastrar mais de um veículo?",
    answer:
      "No plano Gratuito você cadastra um veículo. No Premium, os veículos são ilimitados, com controle completo de abastecimentos, consumo médio e custo por quilômetro.",
  },
  {
    question: "Posso controlar despesas recorrentes?",
    answer:
      "Sim. Água, energia, internet, aluguel, mensalidades e assinaturas podem ser cadastradas com vencimento, frequência e lançamento automático, além de alertas antes do vencimento.",
  },
  {
    question: "Posso exportar relatórios?",
    answer:
      "Sim. Os relatórios podem ser exportados em PDF e CSV, ou impressos, com métricas, gráficos e a lista completa de transações do período.",
  },
  {
    question: "Funciona no celular?",
    answer:
      "Sim. A interface é totalmente responsiva, com navegação otimizada para celular, tablet e desktop, incluindo modo claro e escuro.",
  },
  {
    question: "Posso excluir minha conta?",
    answer:
      "Sim. A exclusão pode ser solicitada a qualquer momento nas configurações e remove seus dados pessoais e financeiros, após confirmação.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="section-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold text-brand">Perguntas frequentes</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Ainda com dúvidas?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Reunimos as perguntas mais comuns de quem está começando a organizar as finanças.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-base font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
