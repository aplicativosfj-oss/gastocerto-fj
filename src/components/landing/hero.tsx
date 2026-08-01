import { Link } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import {
  ArrowRight,
  Flame,
  Fuel,
  KeyRound,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from "lucide-react";

import heroBg from "@/assets/hero-desk-night.jpg";
import heroMobileBg from "@/assets/hero-mobile.jpg";
import { Button } from "@/components/ui/button";
import { CodeAccessDialog } from "@/components/landing/code-access-dialog";
import { GridPattern, RingChart, Sparkline } from "@/components/landing/decor";
import { formatCurrency } from "@/lib/format";


const DashboardPreview = lazy(() =>
  import("@/components/landing/dashboard-preview").then((m) => ({ default: m.DashboardPreview })),
);

const stats = [
  { label: "Despesas do mês", value: formatCurrency(3782.45), hint: "consolidado de julho" },
  { label: "Resultado mensal", value: "R$ 640", hint: "receitas menos despesas" },
  { label: "Registro de lançamento", value: "10 s", hint: "categoria, data e anexo" },
];

const mobileRows = [
  { label: "Combustível", value: "R$ 742,30", icon: Fuel, share: 62 },
  { label: "Gás de cozinha", value: "R$ 119,90", icon: Flame, share: 28 },
] as const;

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate flex items-center overflow-hidden bg-[oklch(0.16_0.03_258)] pt-[4.75rem] pb-7 text-white sm:min-h-[46svh] sm:max-h-[540px] sm:pt-20 sm:pb-7 lg:pt-24"
    >
      {/* photographic layer: desktop/tablet only — on phones it crops badly */}
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1088}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 hidden size-full object-cover object-right opacity-80 sm:block"
      />
      {/* phone background: imagem vertical de tendência + véu para contraste */}
      <img
        src={heroMobileBg}
        alt=""
        aria-hidden="true"
        width={768}
        height={1344}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 size-full object-cover object-center sm:hidden"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 sm:hidden bg-[linear-gradient(180deg,oklch(0.145_0.028_258/0.82)_0%,oklch(0.145_0.028_258/0.62)_45%,oklch(0.145_0.028_258/0.92)_100%)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden sm:block bg-[linear-gradient(100deg,oklch(0.16_0.03_258)_18%,oklch(0.16_0.03_258/0.88)_46%,oklch(0.16_0.03_258/0.35)_100%)]"
      />
      <GridPattern className="absolute inset-0 -z-10 size-full text-white/10" />
      <div
        aria-hidden="true"
        className="absolute -left-24 -top-16 -z-10 size-[320px] rounded-full bg-brand/30 blur-[110px] sm:-left-32 sm:top-1/4 sm:size-[420px] sm:bg-brand/25 sm:blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-0 -z-10 size-[260px] rounded-full bg-success/20 blur-[110px] sm:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-14 bg-[linear-gradient(180deg,transparent,oklch(0.145_0.028_258))] sm:hidden"
      />

      <div className="section-shell relative grid w-full items-center gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-9 xl:gap-11">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur sm:py-0.5 sm:text-[11px]">
            <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
            Controle hoje, tranquilidade sempre.
          </span>

          <h1 className="font-display mt-3 text-[1.95rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-white sm:mt-2.5 sm:text-[2.4rem] lg:text-[2.75rem] xl:text-[3.1rem]">
            Seu dinheiro sob controle,{" "}
            <span className="bg-[linear-gradient(90deg,oklch(0.92_0.05_190),oklch(0.85_0.13_152))] bg-clip-text text-transparent">
              sua vida com tranquilidade.
            </span>
          </h1>

          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/90 sm:mt-2 sm:text-[15px] max-sm:line-clamp-2">
            Controle despesas, combustível e gás em um sistema único e profissional.
          </p>

          {/* CTAs: full-width stacked on phone, inline from sm */}
          <div className="mt-5 grid gap-2 sm:mt-3.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <Button
              className="h-12 w-full justify-center px-4 text-sm font-semibold shadow-lifted sm:h-11 sm:w-auto sm:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              asChild
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                <span className="truncate">Criar conta grátis</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </Button>
            <CodeAccessDialog>
              <Button
                variant="outline"
                className="h-12 w-full justify-center border-white/25 bg-white/10 px-4 text-sm text-white backdrop-blur hover:bg-white/20 hover:text-white sm:h-11 sm:w-auto sm:bg-white/5 sm:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <KeyRound className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Tenho um código</span>
              </Button>
            </CodeAccessDialog>
          </div>


          {/* phone-only summary card replaces the empty photo space */}
          <div className="mt-6 rounded-2xl border border-white/15 bg-[oklch(0.22_0.035_258/0.72)] p-3.5 shadow-lifted backdrop-blur-md sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                  Julho de 2026
                </p>
                <p className="tabular mt-0.5 text-xl font-bold text-white">{formatCurrency(3782.45)}</p>
                <p className="text-[11px] text-white/90">despesas consolidadas</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
                <RingChart className="size-9 shrink-0 text-brand" value={68} />
                <div className="min-w-0">
                  <p className="text-[10px] text-white/90">Orçamento</p>
                  <p className="tabular text-[13px] font-bold text-white">68%</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                <TrendingDown className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                Despesas vs. junho
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkline className="h-6 w-16 text-success" />
                <span className="tabular text-[11px] font-semibold text-success">-8,2%</span>
              </span>
            </div>

            <ul className="mt-2.5 grid gap-1.5">
              {mobileRows.map((row) => (
                <li key={row.label} className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-white/90">
                      <row.icon className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="tabular shrink-0 text-[12px] font-semibold text-white">
                      {row.value}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-white/10"
                  >
                    <span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,var(--brand),oklch(0.8_0.12_190))]"
                      style={{ width: `${row.share}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/90">
              <Wallet className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
              Consolidação diária automática
            </p>
          </div>

          <dl className="mt-4 hidden grid-cols-3 gap-2 border-t border-white/10 pt-3 sm:grid">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="truncate text-[10px] uppercase tracking-wide text-white/90 sm:text-[11px]">
                  {stat.label}
                </dt>
                <dd className="tabular mt-0.5 truncate text-sm font-bold text-white sm:text-base">
                  {stat.value}
                </dd>
                <p className="hidden truncate text-[11px] text-white/90 sm:block">{stat.hint}</p>
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

          <div className="absolute -left-10 bottom-16 w-44 rounded-2xl border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] p-3 shadow-lifted backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] text-white/90">
              <span className="inline-flex items-center gap-1.5 font-medium text-white/90">
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
              <p className="text-[11px] text-white/90">Orçamento</p>
              <p className="tabular text-sm font-bold text-white">68% usado</p>
            </div>
          </div>

          <div className="absolute -bottom-2 right-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.2_0.03_258/0.85)] px-3 py-1.5 text-[11px] font-medium text-white/90 shadow-lifted backdrop-blur-md">
            <Wallet className="size-3.5 text-brand" aria-hidden="true" />
            Consolidação diária automática
          </div>
        </div>
      </div>
    </section>
  );
}
