import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ReadOnlyBanner } from "@/components/finance/read-only-banner";
import {
  ArrowLeftRight,
  Baby,
  BarChart3,
  Bell,
  CalendarClock,
  Car,
  ChevronDown,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Plus,
  Menu,
  PiggyBank,
  ShieldCheck,
  RefreshCcw,
  User2,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { useKidsRealtimeAlerts } from "@/lib/kids-realtime";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePlanRealtimeSync } from "@/hooks/use-plan";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useProfile, useRoles } from "@/lib/queries";
import { clearBrowserCredentials } from "@/lib/local-session";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";


type Kind = "expense" | "income";
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
    label: "Veículos e consumo",
    to: "/veiculos",
    icon: Car,
    children: [
      { key: "vehicles.fuel", label: "Abastecimentos", to: "/veiculos" },
      { key: "vehicles.report", label: "Relatório de gastos", to: "/veiculos-relatorio" },
      { key: "vehicles.settings", label: "Configurações", to: "/veiculos-configuracoes" },
      { key: "vehicles.audit", label: "Auditoria", to: "/veiculos-auditoria" },
      { key: "vehicles.gas", label: "Botijão de gás", to: "/gas" },
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
      { key: "analytics.advisor", label: "Consultor de IA", to: "/consultor" },
      { key: "analytics.reconciliation", label: "Reconciliação", to: "/reconciliacao" },
    ],
  },
  {
    key: "kids",
    label: "Espaço Kids",
    to: "/kids-auditoria",
    icon: Baby,
    children: [
      { key: "kids.audit", label: "Histórico e relatórios", to: "/kids-auditoria" },
    ],
  },
  { key: "alerts", label: "Calendário e alertas", to: "/calendario", icon: CalendarClock },
];

// Navegação exclusiva da área administrativa: nada de funções de cliente aqui.
const adminNavGroups: NavGroup[] = [
  { key: "admin", label: "Administração", to: "/admin", icon: ShieldCheck },
  { key: "profile", label: "Minha conta", to: "/perfil", icon: User2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [quickEntry, setQuickEntry] = useState<Kind | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: profile } = useProfile();
  const { data: roles } = useRoles();
  const { data: notifications } = useNotifications();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  usePlanRealtimeSync();
  // Avisos e conquistas do Espaço Kids chegam sem recarregar a tela.
  useKidsRealtimeAlerts();
  const unreadCount = (notifications ?? []).filter((item) => !item.read_at).length;
  const isStaff = (roles ?? []).some((role) => role === "admin" || role === "support");
  const isAdminArea = pathname.startsWith("/admin");
  const baseItems: NavGroup[] = isAdminArea
    ? adminNavGroups
    : isStaff
      ? [...navGroups, { key: "admin", label: "Administração", to: "/admin", icon: ShieldCheck }]
      : [...navGroups];
  const items: NavGroup[] = baseItems.map((group) => ({
    ...group,
    children: group.children && group.children.length > 0 ? group.children : undefined,
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
    // Não deixa preferências/rascunhos deste usuário no navegador compartilhado.
    clearBrowserCredentials();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/20 lg:flex">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 lg:flex",
          railCollapsed ? "w-[76px]" : "w-[268px]",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-3">
          <Link
            to={isAdminArea ? "/admin" : "/painel"}
            aria-label="Ir para o painel"
            className="min-w-0 transition-transform hover:scale-[1.02]"
          >
            <Logo compact={railCollapsed} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8 text-muted-foreground"
            onClick={() => setRailCollapsed((value) => !value)}
            aria-label={railCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {railCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        {!isAdminArea ? (
          <div className={cn("space-y-1.5 border-b border-border p-3", railCollapsed && "px-2")}>
            <Button
              onClick={() => setQuickEntry("expense")}
              className="w-full gap-2 bg-brand text-brand-foreground hover:opacity-90"
              size={railCollapsed ? "icon" : "default"}
              aria-label="Nova despesa"
            >
              <Plus className="size-4" aria-hidden="true" />
              {!railCollapsed ? <span>Nova despesa</span> : null}
            </Button>
            {!railCollapsed ? (
              <Button
                variant="outline"
                onClick={() => setQuickEntry("income")}
                className="w-full gap-2 border-emerald-500/30 text-foreground"
              >
                <TrendingUp className="size-4 text-emerald-500" aria-hidden="true" />
                Nova receita
              </Button>
            ) : null}
          </div>
        ) : null}

        <nav aria-label="Menu principal" className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((item) => {
            const isActive = activeGroup?.to === item.to;
            const isOpen = !railCollapsed && (expanded ? expanded === item.key : isActive);
            const hasChildren = Boolean(item.children && item.children.length > 1);
            return (
              <div key={item.to}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-xl transition-colors",
                    isActive ? "bg-brand/10" : "hover:bg-secondary/70",
                  )}
                >
                  <Link
                    to={item.to as never}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      railCollapsed && "justify-center px-0",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg border",
                        isActive
                          ? "border-brand/40 bg-brand/15 text-brand"
                          : "border-border bg-secondary/60 text-brand",
                      )}
                    >
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    {!railCollapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                  {hasChildren && !railCollapsed ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? "" : item.key)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Recolher" : "Expandir"} ${item.label}`}
                      className="mr-1.5 grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                    >
                      <ChevronDown
                        className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                      />
                    </button>
                  ) : null}
                </div>

                {hasChildren && isOpen ? (
                  <div className="ml-[26px] mt-1 space-y-0.5 border-l border-border pl-2.5">
                    {item.children!.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to as never}
                        aria-current={pathname === child.to ? "page" : undefined}
                        className={cn(
                          "block truncate rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                          pathname === child.to
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <Link
            to="/perfil"
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/70",
              railCollapsed && "justify-center px-0",
            )}
          >
            <Avatar className="size-8 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!railCollapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold">
                  {profile?.full_name ?? "Minha conta"}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Meu perfil e plano
                </span>
              </span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 text-muted-foreground",
              railCollapsed && "justify-center",
            )}
            onClick={handleSignOut}
            aria-label="Sair"
          >
            <LogOut className="size-4" />
            {!railCollapsed ? "Sair" : null}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Link to="/painel" className="min-w-0 lg:hidden">
                <Logo compact />
              </Link>
              <p className="hidden min-w-0 truncate text-sm font-semibold lg:block">
                {activeGroup ? activeGroup.label : "Painel"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {!isAdminArea ? (
                <>
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
                  <button
                    type="button"
                    onClick={() => setQuickEntry("expense")}
                    aria-label="Novo lançamento"
                    title="Novo lançamento"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-[12px] font-semibold text-brand-foreground transition-opacity hover:opacity-90 sm:h-9 sm:px-3"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Lançar</span>
                  </button>
                </>
              ) : null}
              <ThemeToggle />

              <Link to="/perfil" aria-label="Meu perfil">
                <Avatar className="size-7 sm:size-8">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>

          {/* Faixa sempre presente e com altura fixa: alternar seção nunca
              muda a altura do header nem "redimensiona" a janela ativa. */}
          <div className="border-t border-border bg-background/80">
            <nav
              aria-label="Seções da área"
              className="subnav-strip mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-3 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {subTabs.length > 1 ? (
                subTabs.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to as never}
                    aria-current={pathname === tab.to ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
                      pathname === tab.to
                        ? "bg-brand text-brand-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))
              ) : (
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {activeGroup?.label ?? "Painel"}
                </span>
              )}
            </nav>
          </div>
        </header>

        <main className="app-main mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-2.5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:pb-6">
          {!isAdminArea ? <ReadOnlyBanner /> : null}
          {children}
        </main>

        <footer className="hidden border-t border-border px-4 py-2 text-center text-[11px] text-muted-foreground lg:block">
          Dev. Franc D&apos;nis · Feijó-AC
        </footer>
      </div>

      {quickEntry ? (
        <TransactionDialog
          open
          kind={quickEntry}
          onOpenChange={(value) => {
            if (!value) setQuickEntry(null);
          }}
        />
      ) : null}

      <MobileTabBar
        items={items}
        activeGroup={activeGroup?.to}
        open={open}
        onOpenChange={setOpen}
        onSignOut={handleSignOut}
        adminArea={isAdminArea}
        onQuickEntry={(kind) => setQuickEntry(kind)}

        
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
  adminArea = false,
  onQuickEntry,
}: {
  items: NavGroup[];
  activeGroup?: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSignOut: () => void;
  adminArea?: boolean;
  onQuickEntry: (kind: Kind) => void;
}) {
  const navigate = useNavigate();
  const primary = adminArea
    ? items
    : MOBILE_PRIMARY.map((to) => items.find((item) => item.to === to)).filter(
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
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86svh] overflow-y-auto rounded-t-3xl border-t border-border bg-background pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lifted">
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-tight">
                    {adminArea ? "Área administrativa" : "Tudo do seu controle"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {adminArea
                      ? "Gestão do negócio, usuários e licenças"
                      : "Toque em uma área para abrir a seção"}
                  </p>

                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    aria-label="Fechar menu"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Atalhos rápidos: as ações mais usadas em uma linha só. */}
            {!adminArea ? (
            <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onQuickEntry("income");
                }}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border-emerald-500/25 bg-emerald-500/10 text-[11px] font-bold text-foreground"
              >
                <TrendingUp className="size-4 text-emerald-500" />
                Receita
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onQuickEntry("expense");
                }}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border-rose-500/25 bg-rose-500/10 text-[11px] font-bold text-foreground"
              >
                <TrendingDown className="size-4 text-rose-500" />
                Despesa
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate({ to: "/recorrencia" });
                }}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border-brand/25 bg-brand/10 text-[11px] font-bold text-foreground"
              >
                <RefreshCcw className="size-4 text-brand" />
                Fixos
              </Button>
            </div>
            ) : null}


            {/* Áreas com suas subseções: qualquer página em 2 toques. */}
            <div className="space-y-2 p-3">
              {items.map((item) => {
                const isActive = activeGroup === item.to;
                return (
                  <section
                    key={item.to}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-card",
                      isActive ? "border-brand/40" : "border-border",
                    )}
                  >
                    <Link
                      to={item.to as never}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 px-3 text-[13px] font-bold transition-colors",
                        isActive ? "bg-brand/10 text-foreground" : "text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-lg border",
                          isActive
                            ? "border-brand/40 bg-brand/15 text-brand"
                            : "border-border bg-secondary text-brand",
                        )}
                      >
                        <item.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                    {item.children && item.children.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to as never}
                            onClick={() => onOpenChange(false)}
                            className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors active:bg-brand/15 active:text-foreground"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>

            <div className="border-t border-border p-3">
              <Button variant="outline" className="w-full justify-center gap-2" onClick={onSignOut}>
                <LogOut className="size-4" />
                Sair da conta
              </Button>
            </div>
          </div>
        </div>
      ) : null}


      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className={cn("grid", adminArea ? "grid-cols-3" : "grid-cols-5")}>
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

export { X };
