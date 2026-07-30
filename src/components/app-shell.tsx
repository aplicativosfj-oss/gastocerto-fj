import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  Car,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu,
  Paperclip,
  PiggyBank,
  ShieldCheck,
  Target,
  TrendingUp,
  User2,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile, useRoles } from "@/lib/queries";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const navItems = [
  { label: "Visão geral", to: "/painel", icon: LayoutDashboard },
  { label: "Transações", to: "/lancamentos", icon: ArrowLeftRight },
  { label: "Receitas", to: "/receitas", icon: TrendingUp },
  { label: "Recorrentes", to: "/recorrencia", icon: CalendarClock },
  { label: "Veículos", to: "/veiculos", icon: Car },
  { label: "Categorias", to: "/categorias", icon: ListTree },
  { label: "Orçamentos", to: "/orcamentos", icon: PiggyBank },
  { label: "Metas", to: "/metas", icon: Target },
  { label: "Relatórios", to: "/relatorios", icon: BarChart3 },
  { label: "Calendário", to: "/calendario", icon: CalendarDays },
  { label: "Comprovantes", to: "/comprovantes", icon: Paperclip },
  { label: "Meu perfil", to: "/perfil", icon: User2 },
] as const;


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
  const items: Array<{ label: string; to: string; icon: typeof LayoutDashboard }> = isStaff
    ? [...navItems, { label: "Administração", to: "/admin", icon: ShieldCheck }]
    : [...navItems];

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
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/painel" aria-label="Ir para o painel">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink key={item.to} item={item} active={pathname === item.to} />
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
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
                  active={pathname === item.to}
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
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
