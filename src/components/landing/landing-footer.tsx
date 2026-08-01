import { Instagram, Linkedin, Lock, Mail, Youtube, CheckCircle2, Send, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { ContactModal } from "@/components/finance/contact-modal";
import { useState } from "react";

const links = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Segurança", href: "#seguranca" },
  { label: "FAQ", href: "#faq" },
];

const legalLinks = [
  { label: "Termos de uso", to: "/termos" as const },
  { label: "Privacidade", to: "/privacidade" as const },
];

const socials = [
  { label: "Instagram", icon: Instagram, href: "#inicio" },
  { label: "LinkedIn", icon: Linkedin, href: "#inicio" },
  { label: "YouTube", icon: Youtube, href: "#inicio" },
  { label: "E-mail", icon: Mail, href: "mailto:aplicativosfj@gmail.com" },
];

// Tap target ≥44px via invisible overlay, keeps the footer visually short.
const tapTarget =
  "relative after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";

const focusRing =
  "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LandingFooter() {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <footer className="mt-auto border-t border-border bg-secondary/30">
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
      <div className="section-shell grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:py-2.5">
        <div className="flex min-w-0 shrink-0 scale-[0.8] items-center justify-self-start sm:scale-90">
          <Logo />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 justify-self-end sm:order-last">
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            aria-label="Entre em contato via e-mail"
            className={`grid size-6 shrink-0 place-items-center text-foreground transition-colors hover:text-foreground focus-visible:text-foreground sm:size-7 ${tapTarget} ${focusRing}`}
          >
            <Mail className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Links do rodapé"
          className="col-span-2 -mx-4 flex h-7 min-w-0 items-center gap-x-3 overflow-x-auto whitespace-nowrap px-4 sm:col-span-1 sm:mx-0 sm:h-auto sm:justify-center sm:gap-x-4 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {legalLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={`shrink-0 py-1 text-[11px] text-foreground transition-colors hover:text-foreground focus-visible:text-foreground sm:text-xs ${focusRing}`}
            >
              {link.label}
            </Link>
          ))}
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`shrink-0 py-1 text-[11px] text-foreground transition-colors hover:text-foreground focus-visible:text-foreground sm:text-xs ${focusRing}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="section-shell flex items-center justify-between gap-x-3 py-1.5 text-[10px] text-foreground sm:py-2 sm:text-[11px]">
          <p className="truncate">© {new Date().getFullYear()} GastoCerto.</p>
          <div className="flex shrink-0 items-center gap-1">
            <p className="truncate">Dev. Franc D&apos;nis · Feijó-AC</p>
            <Link
              to="/admin"
              aria-label="Acesso restrito da equipe"
              title="Acesso da equipe"
              className={`grid size-4 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground ${tapTarget} ${focusRing}`}
            >
              <Lock className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
