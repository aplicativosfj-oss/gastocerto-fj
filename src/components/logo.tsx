import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo-full.png.asset.json";

export function BrandMark({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-soft", className)}>
      <img 
        src={logoAsset.url} 
        alt="GastoCerto Logo Mark" 
        className="h-full w-full object-contain"
      />
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
      <BrandMark
        className="size-9 shrink-0"
      />
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className={cn(
            "text-lg font-extrabold tracking-tight",
            onDark ? "text-white" : "text-foreground"
          )}>
            Gasto<span className="text-[oklch(0.52_0.13_162)]">Certo</span>
          </span>
          <span className={cn(
            "text-[9px] font-medium uppercase tracking-[0.05em] opacity-80",
            onDark ? "text-white/70" : "text-muted-foreground"
          )}>
            Controle hoje, tranquilidade sempre
          </span>
        </div>
      )}
    </span>
  );
}

