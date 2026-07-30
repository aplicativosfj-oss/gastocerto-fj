/** Rolagem suave com compensação do cabeçalho fixo. */
const HEADER_OFFSET = 80;

export function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;

  window.scrollTo({ top: Math.max(top, 0), behavior: prefersReduced ? "auto" : "smooth" });
  window.history.replaceState(null, "", `#${id}`);
}

/** Handler pronto para links âncora (`#secao`). */
export function handleAnchorClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate?: () => void,
) {
  if (!href.startsWith("#")) return;
  event.preventDefault();
  scrollToSection(href.slice(1));
  onNavigate?.();
}
