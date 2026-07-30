import { Instagram, Linkedin, Lock, Mail, Youtube } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";

const links = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Segurança", href: "#seguranca" },
  { label: "FAQ", href: "#faq" },
  { label: "Privacidade", href: "#seguranca" },
];

const socials = [
  { label: "Instagram", icon: Instagram, href: "#inicio" },
  { label: "LinkedIn", icon: Linkedin, href: "#inicio" },
  { label: "YouTube", icon: Youtube, href: "#inicio" },
  { label: "E-mail", icon: Mail, href: "#inicio" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="section-shell flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5 sm:py-3">
        <div className="flex shrink-0 scale-90 items-center sm:scale-100">
          <Logo />
        </div>

        <nav
          aria-label="Links do rodapé"
          className="order-last -mx-4 flex w-full min-w-0 items-center gap-x-3 overflow-x-auto whitespace-nowrap px-4 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center sm:gap-x-4 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:text-xs"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              aria-label={social.label}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:size-7"
            >
              <social.icon className="size-3.5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="section-shell flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2 text-[10px] text-muted-foreground sm:text-[11px]">
          <p>© {new Date().getFullYear()} GastoCerto.</p>
          <div className="flex items-center gap-1.5">
            <p>Dev. Franc D&apos;nis · Feijó-AC</p>
            <Link
              to="/admin"
              aria-label="Acesso restrito da equipe"
              title="Acesso da equipe"
              className="grid size-4 place-items-center rounded text-muted-foreground/40 transition-colors hover:text-foreground"
            >
              <Lock className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
