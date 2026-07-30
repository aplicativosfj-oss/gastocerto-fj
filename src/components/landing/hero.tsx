import { Link } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { ArrowRight, ChevronDown, PlayCircle, ShieldCheck, TrendingDown, Wallet } from "lucide-react";

import heroBg from "@/assets/hero-desk-night.jpg";
import { Button } from "@/components/ui/button";
import { DemoDialog } from "@/components/landing/demo-dialog";
import { GridPattern, RingChart, Sparkline } from "@/components/landing/decor";
import { formatCurrency } from "@/lib/format";
import { handleAnchorClick } from "@/lib/scroll";

const DashboardPreview = lazy(() =>
  import("@/components/landing/dashboard-preview").then((m) => ({ default: m.DashboardPreview })),
);

const stats = [
  { label: "Fecha o mês em", value: formatCurrency(3782.45), hint: "8,2% menos que junho" },
  { label: "Sobra no bolso", value: "R$ 640/mês", hint: "média após 90 dias" },
  { label: "Lançar um gasto", value: "10 segundos", hint: "com categoria e anexo" },
];

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate flex min-h-[40svh] sm:min-h-[46svh] max-h-[540px] items-center overflow-hidden bg-[oklch(0.16_0.03_258)] pt-16 pb-5 sm:pt-20 sm:pb-7 lg:pt-24 text-white"
    >
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1088}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 size-full object-cover object-right opacity-80"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,oklch(0.16_0.03_258)_18%,oklch(0.16_0.03_258/0.88)_46%,oklch(0.16_0.03_258/0.35)_100%)]"
      />
      <GridPattern className="absolute inset-0 -z-10 size-full text-white/10" />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-1/4 -z-10 size-[420px] rounded-full bg-brand/25 blur-[120px]"
      />

      <div className="section-shell relative grid w-full items-center gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-9 xl:gap-11">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur sm:text-[11px]">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            Novo · Painel 2026 com alertas inteligentes
          </span>

          <h1 className="font-display mt-2.5 text-[1.6rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-[2.4rem] lg:text-[2.75rem] xl:text-[3.1rem]">
            Você trabalha demais para não saber onde o dinheiro foi parar.
          </h1>

          <p className="mt-2 max-w-lg text-[13px] leading-snug text-white/70 sm:text-[15px] sm:leading-relaxed">
            O GastoCerto junta combustível, gás, mercado, assinaturas e contas fixas em um
            painel só — e avisa você antes da fatura chegar.
          </p>

          <div className="mt-3.5 grid grid-cols-[1fr_1fr_auto] items-center gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            <Button className="h-10 min-w-0 px-3 text-[13px] shadow-lifted sm:h-11 sm:px-6 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                <span className="truncate">Começar grátis</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </Button>
            <DemoDialog>
              <Button
                variant="outline"
                className="h-10 min-w-0 border-white/25 bg-white/5 px-3 text-[13px] text-white hover:bg-white/15 hover:text-white sm:h-11 sm:px-6 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <PlayCircle className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Ver funcionando</span>
              </Button>
            </DemoDialog>
            <a
              href="#explorar"
              onClick={(event) => handleAnchorClick(event, "#explorar")}
              aria-label="Explorar seções"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:h-11 sm:w-auto sm:px-3 sm:text-sm"
            >
              <span className="hidden sm:inline">Explorar seções</span>
              <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            </a>
          </div>



          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="truncate text-[10px] uppercase tracking-wide text-white/75 sm:text-[11px]">
                  {stat.label}
                </dt>
                <dd className="tabular mt-0.5 truncate text-sm font-bold text-white sm:text-base">
                  {stat.value}
                </dd>
                <p className="hidden truncate text-[11px] text-white/70 sm:block">{stat.hint}</p>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative hidden pt-8 lg:block">
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-[2rem] bg-brand/20 blur-3xl"
          />
          <div className="relative origin-top scale-[0.56] text-foreground -mb-[36%] xl:-mb-[31%] xl:scale-[0.62]">
            <Suspense fallback={<div className="h-[420px] rounded-2xl bg-white/5" />}>
              <DashboardPreview />
            </Suspense>
          </div>

          <div className="absolute -left-10 bottom-2 w-44 rounded-2xl border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] p-3 shadow-lifted backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] text-white/75">
              <span className="inline-flex items-center gap-1.5 font-medium text-white/80">
                <TrendingDown className="size-3.5 text-success" aria-hidden="true" />
                Despesas
              </span>
              <span className="font-semibold text-success">-8,2%</span>
            </div>
            <Sparkline className="mt-2 h-12 w-full text-success" />
          </div>

          <div className="absolute right-0 top-10 flex w-40 items-center gap-3 rounded-2xl border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] p-3 shadow-lifted backdrop-blur-md">
            <RingChart className="size-12 shrink-0 text-brand" value={68} />
            <div className="min-w-0">
              <p className="text-[11px] text-white/75">Orçamento</p>
              <p className="tabular text-sm font-bold text-white">68% usado</p>
            </div>
          </div>

          <div className="absolute -bottom-2 right-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] px-3 py-1.5 text-[11px] font-medium text-white/80 shadow-lifted backdrop-blur-md">
            <Wallet className="size-3.5 text-brand" aria-hidden="true" />
            Atualiza sozinho, todo dia
          </div>
        </div>
      </div>
    </section>
  );
}
