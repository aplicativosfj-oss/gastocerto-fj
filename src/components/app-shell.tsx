import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Car,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  ShieldCheck,
  RefreshCcw,
  User2,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { NavLabelsDialog } from "@/components/nav-labels-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { ContrastToggle } from "@/components/contrast-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePlanRealtimeSync } from "@/hooks/use-plan";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile, useRoles } from "@/lib/queries";
import { sortBySavedOrder, useNavLabels } from "@/lib/nav-labels";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";


type NavChild = { key: string; label: string; to: string };
type NavGroup = {
  key: string;
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  children?: NavChild[];
};

export const navGroups: NavGroup[] = [
  {
    key: "overview",
    label: "Visão geral",
    to: "/painel",
    icon: LayoutDashboard,
    children: [
      { key: "overview.panel", label: "Painel", to: "/painel" },
      { key: "overview.daily", label: "Gastos em detalhes", to: "/diario" },
      { key: "overview.registrations", label: "Meus cadastros", to: "/cadastros" },
    ],
  },
  {
    key: "entries",
    label: "Lançamentos",
    to: "/lancamentos",
    icon: ArrowLeftRight,
    children: [
      { key: "entries.expenses", label: "Despesas", to: "/lancamentos" },
      { key: "entries.incomes", label: "Receitas", to: "/receitas" },
      { key: "entries.recurring", label: "Recorrentes", to: "/recorrencia" },
      { key: "entries.receipts", label: "Comprovantes", to: "/comprovantes" },
    ],
  },
  {
    key: "vehicles",
    label: "Gastos com Veículo",
    to: "/veiculos",
    icon: Car,
    children: [
      { key: "vehicles.fuel", label: "Abastecimentos", to: "/veiculos" },
      { key: "vehicles.report", label: "Relatório de gastos", to: "/veiculos-relatorio" },
      { key: "vehicles.settings", label: "Configurações", to: "/veiculos-configuracoes" },
      { key: "vehicles.audit", label: "Auditoria", to: "/veiculos-auditoria" },
    ],
  },
  { key: "gas", label: "Botijão de gás", to: "/gas", icon: Flame },
  {
    key: "planning",
    label: "Planejamento",
    to: "/orcamentos",
    icon: PiggyBank,
    children: [
      { key: "planning.budgets", label: "Orçamentos", to: "/orcamentos" },
      { key: "planning.commitments", label: "Compromissos", to: "/compromissos" },
      { key: "planning.goals", label: "Metas", to: "/metas" },
      { key: "planning.categories", label: "Categorias", to: "/categorias" },
      { key: "planning.closing", label: "Fechamento mensal", to: "/fechamento" },
      { key: "planning.annual", label: "Balanço anual", to: "/balanco-anual" },
    ],
  },
  {
    key: "analytics",
    label: "Análises",
    to: "/relatorios",
    icon: BarChart3,
    children: [
      { key: "analytics.reports", label: "Relatórios", to: "/relatorios" },
      { key: "analytics.calendar", label: "Calendário e alertas", to: "/calendario" },
      { key: "analytics.advisor", label: "Consultor de IA", to: "/consultor" },
      { key: "analytics.reconciliation", label: "Reconciliação", to: "/reconciliacao" },
    ],
  },
  { key: "profile", label: "Meu perfil", to: "/perfil", icon: User2 },
];


export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: profile } = useProfile();
  const { data: roles } = useRoles();
  const { data: notifications } = useNotifications();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  usePlanRealtimeSync();
  const unreadCount = (notifications ?? []).filter((item) => !item.read_at).length;
  const isStaff = (roles ?? []).some((role) => role === "admin" || role === "support");
  const { labelFor, order } = useNavLabels();
  const baseItems: NavGroup[] = isStaff
    ? [
        ...navGroups,
        { key: "admin", label: "Administração", to: "/admin", icon: ShieldCheck },
      ]
    : [...navGroups];
  const items: NavGroup[] = sortBySavedOrder(baseItems, order["root"]).map((group) => ({
    ...group,
    label: labelFor(group.key, group.label),
    children: sortBySavedOrder(group.children ?? [], order[group.key]).map((child) => ({
      ...child,
      label: labelFor(child.key, child.label),
    })),
  })).map((group) => ({
    ...group,
    children: group.children && group.children.length > 0 ? group.children : undefined,
  }));
  const labelGroups = baseItems.map((group) => ({
    key: group.key,
    fallback: group.label,
    children: group.children?.map((child) => ({ key: child.key, fallback: child.label })),
  }));




  const activeGroup = items.find(
    (group) => group.to === pathname || group.children?.some((child) => child.to === pathname),
  );
  const subTabs = activeGroup?.children ?? [];



  const initials = (profile?.full_name ?? "GC")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/20 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link to="/painel" aria-label="Ir para o painel">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink key={item.to} item={item} active={activeGroup?.to === item.to} />
          ))}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <NavLabelsDialog groups={labelGroups} />
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>

      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Link to="/painel" className="min-w-0 lg:hidden">
                <Logo />
              </Link>
              <p className="hidden min-w-0 truncate text-sm font-semibold lg:block">
                {activeGroup ? activeGroup.label : "Painel"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link to="/calendario" aria-label="Notificações" className="relative">
                <span className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:size-9">
                  <Bell className="size-[18px]" />
                </span>
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <ThemeToggle />
              <ContrastToggle />
              <Link to="/perfil" aria-label="Meu perfil">
                <Avatar className="size-7 sm:size-8">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>

          {subTabs.length > 1 ? (
            <div className="border-t border-border bg-background/80">
              <nav
                aria-label="Seções da área"
                className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-3 py-1 sm:px-4 sm:py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {subTabs.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to as never}
                    aria-current={pathname === tab.to ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
                      pathname === tab.to
                        ? "bg-brand text-brand-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-2.5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:pb-6">
          {children}
        </main>
        <footer className="hidden border-t border-border px-4 py-2 text-center text-[11px] text-muted-foreground lg:block">
          Dev. Franc D&apos;nis · Feijó-AC
        </footer>
      </div>

      <MobileTabBar
        items={items}
        activeGroup={activeGroup?.to}
        open={open}
        onOpenChange={setOpen}
        onSignOut={handleSignOut}
        labelGroups={labelGroups}
      />
    </div>
  );
}

const MOBILE_PRIMARY = ["/painel", "/lancamentos", "/veiculos", "/relatorios"];

function MobileTabBar({
  items,
  activeGroup,
  open,
  onOpenChange,
  onSignOut,
  labelGroups,
}: {
  items: NavGroup[];
  activeGroup?: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSignOut: () => void;
  labelGroups: Array<{ key: string; fallback: string; children?: Array<{ key: string; fallback: string }> }>;
}) {
  const primary = MOBILE_PRIMARY.map((to) => items.find((item) => item.to === to)).filter(
    (item): item is NavGroup => Boolean(item),
  );

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[78svh] overflow-y-auto rounded-t-2xl border-t border-border bg-background pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lifted">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
              <p className="text-sm font-semibold">Menu</p>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fechar menu">
                <X className="size-5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-3">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to as never}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] font-medium transition-colors",
                    activeGroup === item.to ? "border-brand/40 bg-brand/10 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0 text-brand" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="grid gap-1.5 border-t border-border p-3">
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <ContrastToggle />
                <div className="min-w-0 flex-1">
                  <NavLabelsDialog groups={labelGroups} />
                </div>
              </div>
              <Button variant="outline" className="justify-center gap-2" onClick={onSignOut}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {primary.map((item) => (
            <Link
              key={item.to}
              to={item.to as never}
              aria-current={activeGroup === item.to ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                activeGroup === item.to ? "text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="w-full truncate text-center leading-tight">{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
              open ? "text-brand" : "text-muted-foreground",
            )}
          >
            <Menu className="size-5 shrink-0" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: { label: string; to: string; icon: typeof LayoutDashboard };
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={item.to as never}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export { X };
