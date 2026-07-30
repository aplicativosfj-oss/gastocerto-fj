import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/landing/decor";

export function CtaBanner() {
  return (
    <section className="section-y">
      <div className="section-shell">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[oklch(0.18_0.032_258)] px-5 py-5 text-white shadow-lifted sm:px-10 sm:py-7">
          <GridPattern className="absolute inset-0 -z-10 size-full text-white/10" />
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 -z-10 size-[320px] rounded-full bg-brand/30 blur-[120px]"
          />

          <div className="grid items-center gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="min-w-0">
              <h2 className="section-title">
                Comece hoje a controlar cada real que você gasta
              </h2>
              <p className="mt-2 max-w-xl text-[13px] leading-snug text-white/70 sm:text-sm">
                Crie sua conta gratuita em menos de um minuto ou explore a demonstração com dados
                de exemplo — sem cartão de crédito.
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-[11px] text-white/60">
                <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                Exporte ou exclua seus dados quando quiser.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <Button className="h-10 w-full shadow-lifted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Criar conta
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-10 w-full border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                asChild
              >
                <Link to="/demonstracao">
                  <PlayCircle className="size-4" aria-hidden="true" />
                  Demonstração
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="col-span-2 h-9 w-full text-white/80 hover:bg-white/10 hover:text-white lg:col-span-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                asChild
              >
                <Link to="/auth" search={{ mode: "login" }}>
                  Já tenho conta — entrar
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
