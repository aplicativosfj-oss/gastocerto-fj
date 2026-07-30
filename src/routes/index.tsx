import { createFileRoute } from "@tanstack/react-router";

import { Benefits } from "@/components/landing/benefits";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { PageBackground } from "@/components/landing/page-background";
import { SectionHub } from "@/components/landing/section-hub";
import { ShowcaseCarousel } from "@/components/landing/showcase-carousel";

import { Pricing } from "@/components/landing/pricing";
import { Security } from "@/components/landing/security";
import { Testimonials } from "@/components/landing/testimonials";

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
        <ShowcaseCarousel />
        <Features />
        <Benefits />
        <Pricing />
        <Testimonials />
        <Security />
        <Faq />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}

