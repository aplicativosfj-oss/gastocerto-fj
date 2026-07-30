import { Instagram, Linkedin, Lock, Mail, Youtube } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";

const links = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Segurança", href: "#seguranca" },
  { label: "FAQ", href: "#faq" },
  { label: "Termos", href: "#seguranca" },
  { label: "Privacidade e LGPD", href: "#seguranca" },
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
      <div className="section-shell flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <div className="flex items-center gap-1.5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <social.icon className="size-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-4 gap-y-1.5">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="section-shell flex flex-col items-center justify-between gap-1 py-3 text-[11px] text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} GastoCerto. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2">
            <p>Feito no Brasil · Dev. Franc D&apos;nis · Feijó-AC</p>
            <Link
              to="/admin"
              aria-label="Acesso restrito da equipe"
              title="Acesso da equipe"
              className="grid size-5 place-items-center rounded-md text-muted-foreground/40 transition-colors hover:text-foreground"
            >
              <Lock className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
