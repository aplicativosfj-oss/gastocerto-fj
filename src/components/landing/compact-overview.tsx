import { useEffect, useState } from "react";
import {
  Banknote,
  BarChart3,
  Bell,
  CalendarClock,
  Car,
  CreditCard,
  Droplets,
  Dumbbell,
  Fingerprint,
  Flame,
  Fuel,
  HelpCircle,
  LayoutDashboard,
  Lock,
  PiggyBank,
  Receipt,
  Repeat,
  ScrollText,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Star,
  Target,
  Tv,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { DemoDialog } from "@/components/landing/demo-dialog";
import { Reveal } from "@/components/landing/reveal";
import { handleAnchorClick } from "@/lib/scroll";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Feature = { icon: LucideIcon; title: string; text: string; tag: string };

const featureGroups: { group: string; caption: string; items: Feature[] }[] = [
  {
    group: "Dia a dia",
    caption: "Registros e contas do dia a dia",
    items: [
      {
        icon: Receipt,
        title: "Lançamentos em 10s",
        text: "Despesa ou receita com categoria, anexo, parcelas e data retroativa.",
        tag: "Rápido",
      },
      {
        icon: ShoppingBasket,
        title: "Mercado e alimentação",
        text: "Compras do mês, feira, delivery e água mineral separados por categoria.",
        tag: "Casa",
      },
      {
        icon: Repeat,
        title: "Contas recorrentes",
        text: "Água, energia, internet e mensalidades lançadas sozinhas todo mês.",
        tag: "Automático",
      },
      {
        icon: Flame,
        title: "Gás de cozinha",
        text: "Histórico de botijões, duração média e aviso quando estiver acabando.",
        tag: "Casa",
      },
    ],
  },
  {
    group: "Veículos e trabalho",
    caption: "Custos de veículos e rodagem",
    items: [
      {
        icon: Fuel,
        title: "Abastecimentos",
        text: "Litros, preço por litro, odômetro validado e detecção de anomalias.",
        tag: "Combustível",
      },
      {
        icon: Car,
        title: "Custo por km",
        text: "Consumo médio por veículo, metas de eficiência e alertas de desvio.",
        tag: "Frota",
      },
      {
        icon: ScrollText,
        title: "Auditoria de odômetro",
        text: "Histórico de alterações, comparação antes/depois e alertas acionados.",
        tag: "Rastreável",
      },
      {
        icon: Banknote,
        title: "Receitas variáveis",
        text: "Ideal para autônomos: entradas por dia, semana ou corrida.",
        tag: "Autônomo",
      },
    ],
  },
  {
    group: "Planejamento",
    caption: "Orçamentos, metas e previsibilidade",
    items: [
      {
        icon: PiggyBank,
        title: "Orçamentos por categoria",
        text: "Limite mensal com barra de consumo e aviso antes de estourar.",
        tag: "Limites",
      },
      {
        icon: Target,
        title: "Metas e aportes",
        text: "Objetivos com progresso mensal, prazo e quanto falta guardar.",
        tag: "Objetivos",
      },
      {
        icon: Wallet,
        title: "Contas e cartões",
        text: "Saldos, faturas, formas de pagamento e conciliação simples.",
        tag: "Carteira",
      },
      {
        icon: Tv,
        title: "Assinaturas e academia",
        text: "Streaming, apps e mensalidades: veja o total escondido do mês.",
        tag: "Recorrente",
      },
    ],
  },
  {
    group: "Inteligência",
    caption: "Relatórios, alertas e comprovantes",
    items: [
      {
        icon: BarChart3,
        title: "Relatórios avançados",
        text: "Filtros por período, categoria e conta, com exportação em CSV e PDF.",
        tag: "Análise",
      },
      {
        icon: CalendarClock,
        title: "Calendário financeiro",
        text: "Vencimentos, recorrências e pendências em uma única linha do tempo.",
        tag: "Agenda",
      },
      {
        icon: Bell,
        title: "Alertas inteligentes",
        text: "Conta a vencer, atraso, orçamento estourado e consumo fora do padrão.",
        tag: "Avisos",
      },
      {
        icon: CreditCard,
        title: "Comprovantes",
        text: "Anexe notas, visualize, baixe em lote e mantenha tudo auditável.",
        tag: "Arquivo",
      },
    ],
  },
];

const highlights = [
  { icon: Droplets, value: "20+", label: "categorias prontas", hint: "gás, combustível, água, roupas…" },
  { icon: Dumbbell, value: "7", label: "módulos integrados", hint: "de lançamentos a auditoria" },
  { icon: ShieldCheck, value: "100%", label: "dados isolados", hint: "cada conta vê só o que é seu" },
];

const steps = [
  { title: "Entre com seu CPF", text: "Cadastro em menos de um minuto, com senha de 6 dígitos." },
  { title: "Lance o gasto na hora", text: "Gás, combustível, mercado, roupas, academia, streaming — tudo pronto." },
  { title: "Veja a sobra crescer", text: "Painel, orçamentos e alertas mostram onde cortar sem sufoco." },
];

const proofs = [
  { name: "Ana Paula", role: "Autônoma · Rio Branco", text: "Achei R$ 380 por mês em assinaturas que eu nem lembrava que existiam." },
  { name: "Rafael Lima", role: "Motorista de app · Feijó", text: "Descobri que rodava por R$ 0,52 o km. Reajustei minha meta no mesmo dia." },
  { name: "Juliana Costa", role: "Professora · Cruzeiro do Sul", text: "Zerei juros de atraso: o app avisa três dias antes de cada conta." },
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

const shortcuts = [
  { label: "Recursos", href: "#recursos", icon: Wallet },
  { label: "Planos", href: "#planos", icon: Sparkles },
  { label: "Segurança", href: "#seguranca", icon: Lock },
  { label: "FAQ", href: "#faq", icon: HelpCircle },
] as const;

const tabs = ["recursos", "como-funciona", "seguranca", "faq"] as const;
type TabValue = (typeof tabs)[number];

const tabMeta: Record<TabValue, { label: string; description: string }> = {
  recursos: { label: "Recursos", description: "Dezesseis recursos organizados em quatro frentes" },
  "como-funciona": { label: "Como funciona", description: "Três passos e depoimentos de clientes" },
  seguranca: { label: "Segurança", description: "LGPD, criptografia e controle de acesso" },
  faq: { label: "FAQ", description: "Perguntas frequentes: seis dúvidas comuns sobre planos e demonstração" },
};

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
    <section id="explorar" className="relative border-y border-border bg-secondary/30 section-y">
      <span id="seguranca" className="block" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--brand)_45%,transparent),transparent)]"
      />
      <div className="section-shell">
        <Reveal className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Recursos da plataforma
            </p>
            <h2 className="mt-1 section-title">
              Um sistema para todo o seu controle financeiro
            </h2>
            <p className="mt-1 max-w-xl text-[12.5px] leading-snug text-muted-foreground sm:text-[13px] sm:leading-relaxed">
              Recursos integrados para o dia a dia, veículos, planejamento e análise.
            </p>
          </div>
          <nav aria-label="Atalhos para seções da página" className="hidden min-w-0 flex-wrap items-center gap-1.5 sm:flex sm:justify-end">
            <DemoDialog>
              <button
                type="button"
                className="group inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <LayoutDashboard className="size-3.5" aria-hidden="true" />
                Ver painel ao vivo
              </button>
            </DemoDialog>
            {shortcuts.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => handleAnchorClick(event, item.href)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <item.icon className="size-3.5" aria-hidden="true" />
                {item.label}
              </a>
            ))}
          </nav>
        </Reveal>

        <Reveal delay={80} className="mt-3 grid gap-1.5 rounded-xl border border-border bg-card/70 p-2 backdrop-blur sm:grid-cols-3 sm:gap-3 sm:p-2.5">
          {highlights.map((item) => (
            <div key={item.label} className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="tabular text-sm font-bold leading-none">{item.value}</p>
                <p className="text-[11px] leading-snug text-muted-foreground sm:truncate">{item.label}</p>
                <p className="hidden truncate text-[10px] text-muted-foreground sm:block">{item.hint}</p>
              </div>
            </div>
          ))}
        </Reveal>


        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="mt-3.5">
          <div role="region" aria-label="Navegação das seções do produto" className="w-full">
            <p id="tabs-hint" className="sr-only">
              Lista de 4 seções em rolagem horizontal. Use as setas esquerda e direita para trocar de seção; o conteúdo é atualizado automaticamente.
            </p>
            <TabsList
              id="recursos"
              aria-label="Seções do produto"
              aria-describedby="tabs-hint"
              className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto p-1 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((value, index) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  id={value === "faq" ? "faq" : undefined}
                  aria-label={`${tabMeta[value].label}: ${tabMeta[value].description} — seção ${index + 1} de ${tabs.length}`}
                  className={value === "faq" ? "shrink-0 scroll-mt-24" : "shrink-0"}
                >
                  {tabMeta[value].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {`Seção ativa: ${tabMeta[tab].label}. ${tabMeta[tab].description}.`}
          </p>

          <TabsContent value="recursos" className="mt-3.5 outline-none panel-enter" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["recursos"].label}</h3>
            <div className="grid gap-2.5 lg:grid-cols-2">
              {featureGroups.map((group, groupIndex) => (
                <Reveal
                  key={group.group}
                  delay={groupIndex * 70}
                  className="rounded-2xl border border-border bg-card/60 p-2.5 backdrop-blur sm:p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                      {group.group}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{group.caption}</p>
                  </div>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {group.items.map((item, itemIndex) => (
                      <div
                        key={item.title}
                        className={
                          itemIndex > 1
                            ? "interactive-card group hidden min-w-0 gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5 sm:flex"
                            : "interactive-card group flex min-w-0 gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5"
                        }
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                          <item.icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-sm font-semibold">{item.title}</p>
                            <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {item.tag}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="como-funciona" className="mt-3.5 outline-none panel-enter" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["como-funciona"].label}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 70}>
                  <div className="interactive-card h-full rounded-xl border border-border bg-card p-3 sm:p-3.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div id="depoimentos" className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {proofs.map((p, index) => (
                <Reveal key={p.name} delay={index * 70}>
                  <div className="interactive-card h-full rounded-xl border border-border bg-card p-3">
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
                </Reveal>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="seguranca" className="mt-3.5 outline-none panel-enter" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["seguranca"].label}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              {pillars.map((pillar, index) => (
                <Reveal key={pillar.title} delay={index * 70}>
                  <div className="interactive-card h-full rounded-xl border border-border bg-card p-3 sm:p-3.5">
                    <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                      <pillar.icon className="size-4" aria-hidden="true" />
                    </span>
                    <p className="mt-2 text-sm font-semibold">{pillar.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pillar.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="faq" className="mt-3.5 outline-none panel-enter" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["faq"].label}</h3>
            <Accordion type="single" collapsible className="grid gap-x-6 sm:grid-cols-2">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.q} value={`item-${index}`}>
                  <AccordionTrigger className="py-2.5 text-left text-[13px] font-semibold sm:text-sm">{faq.q}</AccordionTrigger>
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
