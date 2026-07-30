import { createFileRoute } from "@tanstack/react-router";

import heroBg from "@/assets/hero-workspace.jpg";
import { CompactOverview } from "@/components/landing/compact-overview";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { PageBackground } from "@/components/landing/page-background";
import { SectionHub } from "@/components/landing/section-hub";
import { Pricing } from "@/components/landing/pricing";

const title = "GastoCerto — Controle total dos seus gastos";
const description =
  "Registre despesas, combustível, gás, contas recorrentes e orçamentos. Acompanhe seus hábitos e descubra para onde seu dinheiro está indo.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "preload", as: "image", href: heroBg, fetchPriority: "high" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <PageBackground />
      <LandingHeader />
      <main className="flex-1">

        <Hero />
        <SectionHub />
        <CompactOverview />
        <Pricing />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}

