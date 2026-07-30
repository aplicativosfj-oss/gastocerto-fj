import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", href: "#inicio" },
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Segurança", href: "#seguranca" },
  { label: "Perguntas frequentes", href: "#faq" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/90 text-foreground backdrop-blur-md shadow-soft"
          : "border-b border-white/10 bg-transparent text-white",
      )}
    >
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <a href="#inicio" className="rounded-md" aria-label="GastoCerto — início">
          <Logo />
        </a>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                scrolled
                  ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                  : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className={cn("hidden sm:inline-flex", !scrolled && "text-white hover:bg-white/10 hover:text-white")} />
          <Button
            variant="ghost"
            className={cn("hidden sm:inline-flex", !scrolled && "text-white hover:bg-white/10 hover:text-white")}
            asChild
          >
            <a href="#planos">Entrar</a>
          </Button>
          <Button className="hidden shadow-soft sm:inline-flex" asChild>
            <a href="#planos">Começar gratuitamente</a>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("lg:hidden", !scrolled && "border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white")}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav aria-label="Navegação móvel" className="section-shell flex flex-col py-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <a href="#planos">Entrar</a>
              </Button>
              <Button className="flex-1" asChild>
                <a href="#planos">Começar</a>
              </Button>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
