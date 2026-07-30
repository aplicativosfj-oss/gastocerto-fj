import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/landing/decor";

export function CtaBanner() {
  return (
    <section className="section-y pb-4 sm:pb-6">
      <div className="section-shell">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[oklch(0.18_0.032_258)] px-5 py-5 text-white shadow-lifted sm:px-10 sm:py-7">
          <GridPattern className="absolute inset-0 -z-10 size-full text-white/10" />
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 -z-10 size-[320px] rounded-full bg-brand/30 blur-[120px]"
          />

          <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="section-title">
                Comece hoje a controlar cada real que você gasta
              </h2>
              <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
                Crie sua conta gratuita em menos de um minuto ou explore a demonstração com dados
                de exemplo antes de decidir.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs text-white/60">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                Sem cartão de crédito. Seus dados podem ser exportados ou excluídos quando quiser.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full shadow-lifted" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Criar conta gratuita
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                asChild
              >
                <Link to="/demonstracao">
                  <PlayCircle className="size-4" aria-hidden="true" />
                  Ver demonstração
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="w-full text-white/80 hover:bg-white/10 hover:text-white"
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
