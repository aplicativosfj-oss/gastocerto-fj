import logoAsset from "@/assets/logo-horizontal.png.asset.json";
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
  if (compact) {
    return <BrandMark className={cn("size-10 shrink-0 shadow-lg", className)} />;
  }

  return (
    <div className={cn("relative h-11 transition-transform hover:scale-[1.02]", className)}>
      <img 
        src={logoAsset.url} 
        alt="GastoCerto Logo" 
        className={cn("h-full w-auto object-contain", onDark && "brightness-0 invert")} 
      />
    </div>
  );
}
