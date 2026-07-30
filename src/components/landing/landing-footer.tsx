import { Instagram, Linkedin, Mail, Youtube } from "lucide-react";

import { Logo } from "@/components/logo";

const columns = [
  {
    title: "Produto",
    links: [
      { label: "Recursos", href: "#recursos" },
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Planos", href: "#planos" },
      { label: "Segurança", href: "#seguranca" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { label: "Sobre o GastoCerto", href: "#inicio" },
      { label: "Central de ajuda", href: "#faq" },
      { label: "Contato", href: "#faq" },
      { label: "Perguntas frequentes", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de uso", href: "#seguranca" },
      { label: "Política de privacidade", href: "#seguranca" },
      { label: "LGPD", href: "#seguranca" },
    ],
  },
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
      <div className="section-shell grid gap-8 py-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            O GastoCerto ajuda você a registrar, entender e reduzir seus gastos com clareza e
            segurança.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <social.icon className="size-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="section-shell flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} GastoCerto. Todos os direitos reservados.</p>
          <p>Feito no Brasil · Dev. Franc D&apos;nis · Feijó-AC</p>
        </div>
      </div>
    </footer>
  );
}
