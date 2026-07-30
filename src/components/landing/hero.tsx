import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, PlayCircle, ShieldCheck, TrendingDown, Wallet } from "lucide-react";

import heroBg from "@/assets/hero-workspace.jpg";
import { Button } from "@/components/ui/button";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { DemoDialog } from "@/components/landing/demo-dialog";
import { GridPattern, RingChart, Sparkline } from "@/components/landing/decor";
import { formatCurrency } from "@/lib/format";
import { handleAnchorClick } from "@/lib/scroll";

const stats = [
  { label: "Gasto do mês", value: formatCurrency(3782.45), hint: "-8,2% vs. junho" },
  { label: "Economia média", value: "R$ 640/mês", hint: "após 90 dias de uso" },
  { label: "Custo por km", value: "R$ 0,52", hint: "calculado automaticamente" },
];

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate flex min-h-[78svh] max-h-[900px] items-center overflow-hidden bg-[oklch(0.16_0.03_258)] pt-24 pb-10 text-white"
    >
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1280}
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

      <div className="section-shell relative grid w-full items-center gap-10 lg:grid-cols-[1.05fr_1fr] xl:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            Gestão financeira pessoal
          </span>

          <h1 className="font-display mt-5 text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl xl:text-6xl">
            Controle profissional de cada real que você gasta.
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            Despesas, combustível, contas recorrentes e orçamentos em um só painel — com
            indicadores automáticos e relatórios prontos para decidir.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="shadow-lifted" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar conta gratuita
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <DemoDialog>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              >
                <PlayCircle className="size-4" aria-hidden="true" />
                Ver demonstração
              </Button>
            </DemoDialog>
            <a
              href="#explorar"
              onClick={(event) => handleAnchorClick(event, "#explorar")}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Explorar seções
              <ChevronDown className="size-4" aria-hidden="true" />
            </a>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="truncate text-[11px] uppercase tracking-wide text-white/50">
                  {stat.label}
                </dt>
                <dd className="tabular mt-1 truncate text-base font-bold text-white sm:text-lg">
                  {stat.value}
                </dd>
                <p className="truncate text-[11px] text-white/45">{stat.hint}</p>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative hidden lg:block">
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-[2rem] bg-brand/20 blur-3xl"
          />
          <div className="relative origin-top scale-[0.82] text-foreground xl:scale-[0.88]">
            <DashboardPreview />
          </div>

          <div className="absolute -left-16 bottom-6 w-48 rounded-2xl border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] p-3 shadow-lifted backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1.5 font-medium text-white/80">
                <TrendingDown className="size-3.5 text-success" aria-hidden="true" />
                Despesas
              </span>
              <span className="font-semibold text-success">-8,2%</span>
            </div>
            <Sparkline className="mt-2 h-12 w-full text-success" />
          </div>

          <div className="absolute -right-10 -top-6 flex w-44 items-center gap-3 rounded-2xl border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] p-3 shadow-lifted backdrop-blur-md">
            <RingChart className="size-12 shrink-0 text-brand" value={68} />
            <div className="min-w-0">
              <p className="text-[11px] text-white/60">Orçamento</p>
              <p className="tabular text-sm font-bold text-white">68% usado</p>
            </div>
          </div>

          <div className="absolute -bottom-8 right-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] px-3 py-1.5 text-[11px] font-medium text-white/80 shadow-lifted backdrop-blur-md">
            <Wallet className="size-3.5 text-brand" aria-hidden="true" />
            Sincronizado em tempo real
          </div>
        </div>
      </div>
    </section>
  );
}
