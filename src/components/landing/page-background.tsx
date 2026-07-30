import workspaceBg from "@/assets/hero-workspace.jpg";

/**
 * Plano de fundo realista aplicado a toda a homepage.
 * Fica fixo atrás do conteúdo, com máscara suave para não competir com o texto.
 */
export function PageBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50">
      <img
        src={workspaceBg}
        alt=""
        width={1920}
        height={1280}
        loading="lazy"
        decoding="async"
        className="size-full object-cover opacity-[0.10] dark:opacity-[0.22]"
      />
      <div className="absolute inset-0 bg-background/85 dark:bg-background/80" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_60%)]" />
    </div>
  );
}
