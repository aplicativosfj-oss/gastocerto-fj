import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Car,
  Fingerprint,
  Flame,
  Lock,
  PiggyBank,
  Receipt,
  ScrollText,
  Star,
  Target,
  Wallet,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const features = [
  { icon: Receipt, title: "Lançamentos rápidos", text: "Despesas e receitas em segundos, com categorias, anexos e parcelas." },
  { icon: Car, title: "Combustível", text: "Consumo médio, custo por km e alertas por veículo." },
  { icon: Flame, title: "Gás e recorrentes", text: "Água, energia, internet e assinaturas com vencimento automático." },
  { icon: PiggyBank, title: "Orçamentos", text: "Limites por categoria com aviso antes de estourar." },
  { icon: Target, title: "Metas", text: "Objetivos com progresso mensal e aportes." },
  { icon: BarChart3, title: "Relatórios", text: "Gráficos por período com exportação em CSV e PDF." },
  { icon: CalendarClock, title: "Calendário", text: "Vencimentos, recorrências e pendências em um só lugar." },
  { icon: Bell, title: "Alertas", text: "Notificações de contas a vencer, atrasos e orçamento." },
  { icon: Wallet, title: "Contas e cartões", text: "Saldos, faturas e formas de pagamento organizados." },
];

const steps = [
  { title: "Crie sua conta", text: "Cadastro com CPF e senha em menos de um minuto." },
  { title: "Registre seus gastos", text: "Categorias prontas: gás, combustível, alimentação, streaming e mais." },
  { title: "Acompanhe e economize", text: "Painel, orçamentos e relatórios mostram para onde vai seu dinheiro." },
];

const proofs = [
  { name: "Ana Paula", role: "Autônoma", text: "Descobri R$ 380 por mês em assinaturas esquecidas." },
  { name: "Rafael Lima", role: "Motorista de app", text: "O controle de combustível mostrou meu custo real por km." },
  { name: "Juliana Costa", role: "Professora", text: "Os alertas de vencimento acabaram com os juros por atraso." },
];

const pillars = [
  { icon: ScrollText, title: "LGPD na prática", text: "Coletamos só o necessário e você pode exportar ou excluir tudo." },
  { icon: Lock, title: "Criptografia", text: "HTTPS no tráfego, banco criptografado e comprovantes privados." },
  { icon: Fingerprint, title: "Controle de acesso", text: "Cada conta enxerga apenas os próprios registros." },
];

const faqs = [
  { q: "O sistema é gratuito?", a: "Sim. O plano Gratuito cobre lançamentos, painel mensal, categorias, um veículo e relatórios simplificados." },
  { q: "Meus dados ficam seguros?", a: "Sim. Cada conta acessa apenas os próprios registros, com regras aplicadas no banco de dados." },
  { q: "Posso controlar despesas recorrentes?", a: "Sim, com vencimento, frequência, lançamento automático e alertas antes de vencer." },
  { q: "Posso exportar relatórios?", a: "Sim, em PDF e CSV, com métricas, gráficos e a lista completa do período." },
  { q: "Mensal ou anual?", a: "O conteúdo é o mesmo; no anual o Premium sai por R$ 15,90/mês em vez de R$ 19,90." },
  { q: "Preciso de conta para a demonstração?", a: "Não. A demonstração é aberta, com dados fictícios e sem cartão de crédito." },
];

const tabs = ["recursos", "como-funciona", "seguranca", "faq"] as const;
type TabValue = (typeof tabs)[number];

export function CompactOverview() {
  const [tab, setTab] = useState<TabValue>("recursos");

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "") as TabValue;
      if (tabs.includes(hash)) setTab(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section id="recursos" className="border-y border-border bg-secondary/30 section-y">
      <span id="como-funciona" className="block" />
      <span id="seguranca" className="block" />
      <span id="faq" className="block" />
      <div className="section-shell">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Visão geral</p>
            <h2 className="mt-1 section-title">
              Tudo o que você precisa, em uma página
            </h2>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="mt-4">
          <TabsList className="flex w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="recursos">Recursos</TabsTrigger>
            <TabsTrigger value="como-funciona">Como funciona</TabsTrigger>
            <TabsTrigger value="seguranca">Segurança</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="recursos" className="mt-4">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="flex min-w-0 gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                    <item.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="como-funciona" className="mt-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-border bg-card p-4">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
                    {index + 1}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
            <div id="depoimentos" className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {proofs.map((p) => (
                <div key={p.name} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3 fill-current" />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">“{p.text}”</p>
                  <p className="mt-1.5 truncate text-xs font-semibold">
                    {p.name} · <span className="font-normal text-muted-foreground">{p.role}</span>
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="seguranca" className="mt-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-border bg-card p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                    <pillar.icon className="size-4" />
                  </span>
                  <p className="mt-2 text-sm font-semibold">{pillar.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pillar.text}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="faq" className="mt-4">
            <Accordion type="single" collapsible className="grid gap-x-6 sm:grid-cols-2">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.q} value={`item-${index}`}>
                  <AccordionTrigger className="py-3 text-left text-sm font-semibold">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
