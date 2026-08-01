import logoAsset from "@/assets/logo-full.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-md ring-1 ring-black/5", className)}>
      <img src={logoAsset.url} alt="GastoCerto Logo Mark" className="h-full w-full object-contain transition-transform hover:scale-105" />
    </div>
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
      <BrandMark className="size-9 shrink-0" />
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className={cn("text-lg font-extrabold tracking-tight", onDark ? "text-white" : "text-foreground")}>
            Gasto<span className="text-[oklch(0.52_0.13_162)]">Certo</span>
          </span>
          <span className={cn("text-[9.5px] font-bold uppercase tracking-[0.08em] opacity-90", onDark ? "text-white/80" : "text-muted-foreground")}>
            Controle hoje, tranquilidade sempre
          </span>
        </div>
      )}
    </span>
  );
}
