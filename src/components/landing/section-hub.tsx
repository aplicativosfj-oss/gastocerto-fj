import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  Car,
  HelpCircle,
  LayoutDashboard,
  PieChart,
  Quote,
  ShieldCheck,
  Sparkles,
  Tags,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GridPattern } from "@/components/landing/decor";
import { DemoDialog } from "@/components/landing/demo-dialog";
import { handleAnchorClick } from "@/lib/scroll";

type HubItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  demo?: boolean;
  to?: "/demonstracao" | "/auth";
  search?: { mode: "signup" | "login" };
};

const items: HubItem[] = [
  {
    label: "Painel financeiro",
    description: "Ver demonstração ao vivo",
    icon: LayoutDashboard,
    demo: true,
  },
  {
    label: "Lançamentos",
    description: "Despesas, receitas e comprovantes",
    icon: Wallet,
    href: "#recursos",
  },
  {
    label: "Orçamentos",
    description: "Limites por categoria com alertas",
    icon: PieChart,
    href: "#recursos",
  },
  {
    label: "Combustível",
    description: "Consumo km/l e custo por km",
    icon: Car,
    href: "#recursos",
  },
  {
    label: "Contas recorrentes",
    description: "Pago, pendente e atrasado",
    icon: CalendarClock,
    href: "#como-funciona",
  },
  {
    label: "Relatórios",
    description: "Comparativos e exportação CSV",
    icon: BarChart3,
    href: "#recursos",
  },
  {
    label: "Categorias",
    description: "Organize do seu jeito",
    icon: Tags,
    href: "#como-funciona",
  },
  {
    label: "Planos",
    description: "Gratuito ou profissional",
    icon: Sparkles,
    href: "#planos",
  },
  {
    label: "Depoimentos",
    description: "Resultados reais de usuários",
    icon: Quote,
    href: "#como-funciona",
  },
  {
    label: "Segurança",
    description: "Isolamento total dos seus dados",
    icon: ShieldCheck,
    href: "#seguranca",
  },
  {
    label: "Dúvidas",
    description: "Perguntas frequentes",
    icon: HelpCircle,
    href: "#faq",
  },
  {
    label: "Começar agora",
    description: "Crie sua conta gratuita",
    icon: ArrowUpRight,
    to: "/auth",
    search: { mode: "signup" },
  },
];

const cardClass =
  "group relative flex min-w-0 flex-col justify-between gap-2 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-3.5 text-left shadow-soft backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lifted";

function CardBody({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <>
      <span className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
          {item.label}
        </span>
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{item.description}</span>
      <ArrowUpRight
        className="absolute right-3 top-3 size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
        aria-hidden="true"
      />
    </>
  );
}

export function SectionHub() {
  return (
    <section id="explorar" className="relative isolate overflow-hidden section-y">
      <GridPattern className="absolute inset-0 -z-10 size-full text-foreground/[0.06]" />

      <div className="section-shell">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              Tudo em um só lugar
            </span>
            <h2 className="section-title mt-1 text-foreground">
              Comece pela homepage e vá direto ao que precisa
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cada bloco leva para a seção correspondente — sem precisar procurar no menu.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) =>
            item.demo ? (
              <DemoDialog key={item.label}>
                <button type="button" className={cardClass}>
                  <CardBody item={item} />
                </button>
              </DemoDialog>
            ) : item.to ? (
              <Link
                key={item.label}
                to={item.to}
                search={item.search as never}
                className={cardClass}
              >
                <CardBody item={item} />
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => handleAnchorClick(event, item.href ?? "#")}
                className={cardClass}
              >
                <CardBody item={item} />
              </a>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
