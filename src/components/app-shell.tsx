import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Car,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  ShieldCheck,
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen((value) => !value)}
                aria-label={open ? "Fechar menu" : "Abrir menu"}
                aria-expanded={open}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>
              <Link to="/painel" className="lg:hidden">
                <Logo />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link to="/calendario" aria-label="Notificações" className="relative">
                <span className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <Bell className="size-5" />
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
                <Avatar className="size-8">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>

          {open ? (
            <nav className="border-t border-border bg-background px-3 py-3 lg:hidden">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  active={activeGroup?.to === item.to}
                  onNavigate={() => setOpen(false)}
                />
              ))}
              <Button
                variant="ghost"
                className="mt-1 w-full justify-start gap-2 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sair
              </Button>
            </nav>
          ) : null}

          {subTabs.length > 1 ? (
            <div className="border-t border-border bg-background/80">
              <nav
                aria-label="Seções da área"
                className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 py-1.5"
              >
                {subTabs.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to as never}
                    aria-current={pathname === tab.to ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3 sm:py-4">{children}</main>
        <footer className="border-t border-border px-4 py-2.5 text-center text-xs text-muted-foreground">
          Dev. Franc D&apos;nis · Feijó-AC
        </footer>
      </div>
    </div>
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
