import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  variant = "auto",
}: {
  className?: string;
  /** auto = adapta ao tema; light = fundo claro; dark = fundo escuro */
  variant?: "auto" | "light" | "dark";
}) {
  const plate =
    variant === "light"
      ? "fill-[oklch(0.22_0.06_258)]"
      : variant === "dark"
        ? "fill-[oklch(0.97_0.005_255)]"
        : "fill-[oklch(0.22_0.06_258)] dark:fill-[oklch(0.97_0.005_255)]";
  const bars =
    variant === "light"
      ? "fill-white"
      : variant === "dark"
        ? "fill-[oklch(0.22_0.06_258)]"
        : "fill-white dark:fill-[oklch(0.22_0.06_258)]";
  const ring =
    variant === "light"
      ? "stroke-[oklch(0.75_0.16_162)]"
      : variant === "dark"
        ? "stroke-[oklch(0.58_0.15_162)]"
        : "stroke-[oklch(0.75_0.16_162)] dark:stroke-[oklch(0.58_0.15_162)]";
  const arrow =
    variant === "light"
      ? "fill-[oklch(0.75_0.16_162)]"
      : variant === "dark"
        ? "fill-[oklch(0.58_0.15_162)]"
        : "fill-[oklch(0.75_0.16_162)] dark:fill-[oklch(0.58_0.15_162)]";

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9", className)}
    >
      <rect x="0" y="0" width="64" height="64" rx="16" className={plate} />
      {/* Anel "G" aberto */}
      <path
        d="M32 12a20 20 0 1 0 20 20h-9.5a10.5 10.5 0 1 1-6.9-9.9"
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className={ring}
      />
      {/* Seta de crescimento */}
      <path d="M38 26 51 13" fill="none" strokeWidth="7" strokeLinecap="round" className={ring} />
      <path d="M53 11 54 22 42 10Z" className={arrow} />
      {/* Barras de controle */}
      <rect x="24" y="35" width="4.5" height="8" rx="2" className={bars} />
      <rect x="31" y="30" width="4.5" height="13" rx="2" className={bars} />
      <rect x="38" y="33" width="4.5" height="10" rx="2" className={cn(bars, "opacity-75")} />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  onDark = false,
}: {
  className?: string;
  compact?: boolean;
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark
        variant={onDark ? "dark" : "auto"}
        className="size-9 shrink-0 rounded-xl shadow-soft"
      />
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Gasto<span className={cn(onDark ? "text-[oklch(0.86_0.09_255)]" : "text-brand")}>Certo</span>
        </span>
      )}
    </span>
  );
}

