import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Car,
  Fingerprint,
  Flame,
  HelpCircle,
  LayoutDashboard,
  Lock,
  PiggyBank,
  Receipt,
  ScrollText,
  Sparkles,
  Star,
  Target,
  Wallet,
} from "lucide-react";

import { DemoDialog } from "@/components/landing/demo-dialog";
import { handleAnchorClick } from "@/lib/scroll";
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

const shortcuts = [
  { label: "Recursos", href: "#recursos", icon: Wallet },
  { label: "Planos", href: "#planos", icon: Sparkles },
  { label: "Segurança", href: "#seguranca", icon: Lock },
  { label: "FAQ", href: "#faq", icon: HelpCircle },
] as const;

const tabs = ["recursos", "como-funciona", "seguranca", "faq"] as const;
type TabValue = (typeof tabs)[number];

const tabMeta: Record<TabValue, { label: string; description: string }> = {
  recursos: { label: "Recursos", description: "Nove recursos de controle de gastos" },
  "como-funciona": { label: "Como funciona", description: "Três passos e depoimentos de clientes" },
  seguranca: { label: "Segurança", description: "LGPD, criptografia e controle de acesso" },
  faq: { label: "Perguntas frequentes", description: "Seis dúvidas comuns sobre planos e demonstração" },
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
    <section id="explorar" className="border-y border-border bg-secondary/30 section-y">
      <span id="seguranca" className="block" />
      <div className="section-shell">
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              Tudo em um só lugar
            </p>
            <h2 className="mt-1 section-title">
              Explore o produto sem sair da página
            </h2>
          </div>
          <nav aria-label="Atalhos para seções da página" className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
            <DemoDialog>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="mt-3.5">
          <div
            role="region"
            aria-label="Navegação das seções do produto"
            className="w-full"
          >
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


          <TabsContent value="recursos" className="mt-3.5 outline-none" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["recursos"].label}</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-2.5 sm:flex-row sm:gap-3 sm:p-3">
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

          <TabsContent value="como-funciona" className="mt-3.5 outline-none" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["como-funciona"].label}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
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

          <TabsContent value="seguranca" className="mt-3.5 outline-none" tabIndex={0}>
            <h3 className="sr-only">{tabMeta["seguranca"].label}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                    <pillar.icon className="size-4" />
                  </span>
                  <p className="mt-2 text-sm font-semibold">{pillar.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pillar.text}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="faq" className="mt-3.5 outline-none" tabIndex={0}>
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
