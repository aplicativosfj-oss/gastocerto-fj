import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPreview } from "@/components/landing/dashboard-preview";

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pb-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-accent),transparent)]"
      />
      <div className="section-shell relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
            Controle financeiro pessoal, do jeito simples
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Tenha controle total sobre cada real que você gasta.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Registre suas despesas, acompanhe seus hábitos e descubra exatamente para onde seu
            dinheiro está indo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="shadow-soft" asChild>
              <a href="#planos">
                Começar gratuitamente
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#recursos">Conhecer recursos</a>
            </Button>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            Seus dados são privados, protegidos e podem ser exportados ou excluídos quando quiser.
          </p>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-3xl bg-brand/10 blur-2xl"
          />
          <div className="relative">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
