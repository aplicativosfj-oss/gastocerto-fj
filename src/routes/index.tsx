import { createFileRoute } from "@tanstack/react-router";

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
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <PageBackground />
      <LandingHeader />
      <main>
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

