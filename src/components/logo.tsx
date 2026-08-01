import markAsset from "@/assets/gastocerto-mark.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={markAsset.url}
      alt="GastoCerto"
      className={cn("shrink-0 object-contain", className)}
    />
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
  if (compact) {
    return <BrandMark className={cn("size-9", className)} />;
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className="size-11" />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-display text-[1.35rem] font-extrabold tracking-tight",
            onDark ? "text-white" : "text-[oklch(0.28_0.06_255)] dark:text-white",
          )}
        >
          Gasto<span className="text-[oklch(0.58_0.14_150)]">Certo</span>
        </span>
        <span
          className={cn(
            "mt-1 text-[8.5px] font-semibold uppercase tracking-[0.16em]",
            onDark ? "text-white/90" : "text-muted-foreground",
          )}
        >
          Controle hoje, tranquilidade sempre
        </span>
      </span>
    </span>
  );
}
