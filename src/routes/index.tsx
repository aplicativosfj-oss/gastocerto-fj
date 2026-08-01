import { createFileRoute } from "@tanstack/react-router";

import heroBg from "@/assets/hero-desk-night.jpg";
import { Benefits } from "@/components/landing/benefits";
import { CompactOverview } from "@/components/landing/compact-overview";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { PageBackground } from "@/components/landing/page-background";
import { Pricing } from "@/components/landing/pricing";

const title = "GastoCerto — Controle hoje, tranquilidade sempre";
const description =
  "A plataforma completa para gestão de finanças pessoais. Controle combustível, gás, mercado e contas em um só lugar com o GastoCerto.";

const ogImage = "https://pagina-limpa-controle.lovable.app/og-gastocerto.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pagina-limpa-controle.lovable.app/" },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Painel do GastoCerto com gráficos de gastos" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:image:alt", content: "Painel do GastoCerto com gráficos de gastos" },
    ],
    links: [
      { rel: "canonical", href: "https://pagina-limpa-controle.lovable.app/" },
      { rel: "preload", as: "image", href: heroBg, fetchPriority: "high" },
    ],
  }),

  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">

      <PageBackground />
      <a
        href="#conteudo"
        className="sr-only z-[60] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lifted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader hideActions />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <Hero />
        <Benefits />
        <CompactOverview />
        <Pricing />
        <div className="hidden sm:block">
          <CtaBanner />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

