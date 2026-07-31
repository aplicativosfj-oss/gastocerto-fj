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
import { ThemeToggle } from "@/components/theme-toggle";
import { ContrastToggle } from "@/components/contrast-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile, useRoles } from "@/lib/queries";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NavChild = { label: string; to: string };
type NavGroup = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  children?: NavChild[];
};

export const navGroups: NavGroup[] = [
  { label: "Visão geral", to: "/painel", icon: LayoutDashboard },
  {
    label: "Lançamentos",
    to: "/lancamentos",
    icon: ArrowLeftRight,
    children: [
      { label: "Despesas", to: "/lancamentos" },
      { label: "Receitas", to: "/receitas" },
      { label: "Recorrentes", to: "/recorrencia" },
      { label: "Comprovantes", to: "/comprovantes" },
    ],
  },
  {
    label: "Gastos com Veículo",
    to: "/veiculos",
    icon: Car,
    children: [
      { label: "Abastecimentos", to: "/veiculos" },
      { label: "Configurações", to: "/veiculos-configuracoes" },
      { label: "Auditoria", to: "/veiculos-auditoria" },
    ],
  },
  {
    label: "Planejamento",
    to: "/orcamentos",
    icon: PiggyBank,
    children: [
      { label: "Orçamentos", to: "/orcamentos" },
      { label: "Compromissos", to: "/compromissos" },
      { label: "Metas", to: "/metas" },
      { label: "Categorias", to: "/categorias" },
      { label: "Fechamento mensal", to: "/fechamento" },
    ],
  },
  {
    label: "Análises",
    to: "/relatorios",
    icon: BarChart3,
    children: [
      { label: "Relatórios", to: "/relatorios" },
      { label: "Calendário", to: "/calendario" },
    ],
  },
  { label: "Meu perfil", to: "/perfil", icon: User2 },
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
  const items: NavGroup[] = isStaff
    ? [...navGroups, { label: "Administração", to: "/admin", icon: ShieldCheck }]
    : [...navGroups];

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
        <div className="border-t border-border p-3">
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
