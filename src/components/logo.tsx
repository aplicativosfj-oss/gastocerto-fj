import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9", className)}
    >
      <rect x="0" y="0" width="64" height="64" rx="16" fill="oklch(0.22 0.06 258)" />
      {/* Anel "G" aberto */}
      <path
        d="M32 12a20 20 0 1 0 20 20h-9.5a10.5 10.5 0 1 1-6.9-9.9"
        fill="none"
        stroke="oklch(0.72 0.16 162)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Seta de crescimento */}
      <path
        d="M38 26 51 13"
        fill="none"
        stroke="oklch(0.72 0.16 162)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M53 11 54 22 42 10Z" fill="oklch(0.72 0.16 162)" />
      {/* Barras de controle */}
      <rect x="24" y="35" width="4.5" height="8" rx="2" fill="white" />
      <rect x="31" y="30" width="4.5" height="13" rx="2" fill="white" />
      <rect x="38" y="33" width="4.5" height="10" rx="2" fill="white" opacity="0.75" />
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
      <BrandMark className="size-9 shrink-0 rounded-xl shadow-soft" />
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Gasto<span className={cn(onDark ? "text-[oklch(0.86_0.09_255)]" : "text-brand")}>Certo</span>
        </span>
      )}
    </span>
  );
}
