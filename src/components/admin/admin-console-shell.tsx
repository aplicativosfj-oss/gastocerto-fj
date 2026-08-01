import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

import consoleBg from "@/assets/admin-console-bg.jpg";
import { cn } from "@/lib/utils";

export type AdminSection = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

/**
 * Casca visual exclusiva da central administrativa: fundo próprio, hero
 * institucional e navegação lateral por seções (nada da área do cliente).
 */
export function AdminConsoleShell({
  sections,
  active,
  onSelect,
  operatorName,
  role,
  children,
}: {
  sections: AdminSection[];
  active: string;
  onSelect: (id: string) => void;
  operatorName: string;
  role: string;
  children: React.ReactNode;
}) {
  const current = sections.find((section) => section.id === active);

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50">
        <img
          src={consoleBg}
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
          className="size-full object-cover opacity-[0.18] dark:opacity-[0.35]"
        />
        <div className="absolute inset-0 bg-background/88" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_10%_0%,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_60%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        {/* Hero da central */}
        <header className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur">
          <div className="relative p-4 sm:p-6">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_55%)]" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl border border-border/70 bg-background/70">
                <ShieldCheck className="size-6 text-brand" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                  Central de controle da plataforma
                </p>
                <h1 className="truncate text-xl font-bold sm:text-2xl">GastoCerto — Administração</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {operatorName} · {role} · {current?.hint ?? "Gestão completa da operação"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
          {/* Navegação por seções */}
          <nav
            aria-label="Seções administrativas"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card/70 p-2 backdrop-blur lg:sticky lg:top-4 lg:h-fit lg:flex-col lg:overflow-visible"
          >
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === active;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="whitespace-nowrap lg:whitespace-normal">{section.label}</span>
                </button>
              );
            })}
          </nav>

          <main className="min-w-0 rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur sm:p-5">
            <div className="mb-3 hidden items-baseline justify-between gap-3 sm:flex">
              <h2 className="text-lg font-semibold">{current?.label}</h2>
              <p className="text-xs text-muted-foreground">{current?.hint}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
