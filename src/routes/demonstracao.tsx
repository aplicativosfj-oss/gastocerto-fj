import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, PlayCircle } from "lucide-react";

import { DemoDashboard } from "@/components/demo/demo-dashboard";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ContrastToggle } from "@/components/contrast-toggle";
import { Button } from "@/components/ui/button";

const title = "Demonstração — GastoCerto";
const description =
  "Veja o painel do GastoCerto com dados de exemplo: despesas, orçamentos, contas recorrentes e controle de combustível.";

export const Route = createFileRoute("/demonstracao")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

const highlights = [
  "Resumo do mês com gasto, saldo e disponível",
  "Gráfico diário de despesas e comparação com o mês anterior",
  "Maiores categorias, contas a vencer e últimos lançamentos",
  "Indicadores de combustível: consumo médio e preço por litro",
];

function DemoPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur-md">
        <div className="section-shell flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="GastoCerto — início">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <ContrastToggle className="hidden sm:inline-flex" />
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link to="/auth" search={{ mode: "login" }}>
                Entrar
              </Link>
            </Button>
            <Button className="shadow-soft" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar conta
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="section-shell flex-1 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para a página inicial
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[0.85fr_1.6fr] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
              <PlayCircle className="size-4" aria-hidden="true" />
              Demonstração interativa
            </p>
            <h1 className="mt-2 font-display text-[1.9rem] font-bold tracking-[-0.03em] sm:text-4xl">
              O painel do GastoCerto com dados de exemplo
            </h1>
            <p className="mt-4 text-muted-foreground">
              Esta é uma prévia com números fictícios. Ao criar sua conta, o painel passa a
              refletir seus próprios lançamentos, orçamentos e veículos.
            </p>

            <ul className="mt-6 space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="shadow-soft" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Criar conta gratuita
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth" search={{ mode: "login" }}>
                  Entrar na minha conta
                </Link>
              </Button>
            </div>
          </div>

          <DemoDashboard />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
