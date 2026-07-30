import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Wallet className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Gasto<span className="text-brand [.logo-on-dark_&]:text-[oklch(0.86_0.09_255)]">Certo</span>
        </span>
      )}
    </span>
  );
}
