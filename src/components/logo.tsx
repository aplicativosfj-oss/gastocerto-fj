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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={cn(compact ? "size-10" : "size-11", "shrink-0 shadow-lg")} />
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className={cn("text-xl font-black tracking-tighter", onDark ? "text-white" : "text-foreground")}>
            Gasto<span className="text-[oklch(0.52_0.13_162)]">Certo</span>
          </span>
          <span className={cn("mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] opacity-90", onDark ? "text-white/80" : "text-muted-foreground")}>
            Controle hoje, tranquilidade sempre
          </span>
        </div>
      )}
    </span>
  );
}
