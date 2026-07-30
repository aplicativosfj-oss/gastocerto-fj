import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { handleAnchorClick } from "@/lib/scroll";

const navItems = [
  { label: "Início", href: "#inicio" },
  { label: "Explorar", href: "#explorar" },
  { label: "Recursos", href: "#recursos" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#inicio");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
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
        <a
          href="#inicio"
          onClick={(event) => handleAnchorClick(event, "#inicio")}
          className="rounded-md"
          aria-label="GastoCerto — início"
        >
          <Logo />
        </a>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(event) => handleAnchorClick(event, item.href)}
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
            <Link to="/auth" search={{ mode: "login" }}>Entrar</Link>
          </Button>
          <Button className="hidden shadow-soft sm:inline-flex" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Criar conta gratuita</Link>
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
                onClick={(event) => handleAnchorClick(event, item.href, () => setOpen(false))}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/auth" search={{ mode: "login" }}>Entrar</Link>
              </Button>
              <Button className="flex-1" asChild>
                <a
                  href="#planos"
                  onClick={(event) => handleAnchorClick(event, "#planos", () => setOpen(false))}
                >
                  Começar
                </a>
              </Button>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
