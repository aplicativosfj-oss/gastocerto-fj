import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LandingFooter } from "@/components/landing/landing-footer";
import { Logo } from "@/components/logo";

const focusRing =
  "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="section-shell flex h-14 items-center justify-between">
          <Link to="/" className={`inline-flex ${focusRing}`} aria-label="Ir para a página inicial">
            <Logo />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className={`text-sm font-medium text-primary hover:underline ${focusRing}`}
          >
            Entrar
          </Link>
        </div>
      </header>

      <main id="conteudo" className="section-shell w-full flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{intro}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Última atualização: <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
          </p>

          <nav aria-label="Índice do documento" className="mt-6 rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nesta página
            </h2>
            <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className={`text-primary hover:underline ${focusRing}`}>
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`} className="text-lg font-semibold tracking-tight">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            Este documento é mantido pelo responsável pelo GastoCerto (Dev. Franc D&apos;nis ·
            Feijó-AC) e pode ser atualizado. Dúvidas podem ser enviadas pelo canal de suporte
            informado no aplicativo.
          </p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
