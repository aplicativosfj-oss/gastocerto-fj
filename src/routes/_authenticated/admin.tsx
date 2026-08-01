import { createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  BrainCircuit,
  ClipboardList,
  CreditCard,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Lock,
  ScrollText,
  ShieldCheck,
  Tags,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Suspense, lazy, useMemo, useState } from "react";

import { AdminConsoleShell, type AdminSection } from "@/components/admin/admin-console-shell";
import { AdminOverviewPanel } from "@/components/admin/overview-panel";
import { UsersPanel } from "@/components/admin/users-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/lib/queries";

/** Painéis pesados carregam sob demanda para a central abrir instantaneamente. */
const BusinessDashboard = lazy(() =>
  import("@/components/admin/business-dashboard").then((m) => ({ default: m.BusinessDashboard })),
);
const SupportTicketsPanel = lazy(() =>
  import("@/components/admin/support-tickets-panel").then((m) => ({ default: m.SupportTicketsPanel })),
);
const AnnouncementsPanel = lazy(() =>
  import("@/components/admin/announcements-panel").then((m) => ({ default: m.AnnouncementsPanel })),
);
const PlanConfigsPanel = lazy(() =>
  import("@/components/admin/plan-configs-panel").then((m) => ({ default: m.PlanConfigsPanel })),
);
const LicensesPanel = lazy(() =>
  import("@/components/admin/licenses-panel").then((m) => ({ default: m.LicensesPanel })),
);
const ClientCodesPanel = lazy(() =>
  import("@/components/admin/client-codes-panel").then((m) => ({ default: m.ClientCodesPanel })),
);
const SalesPanel = lazy(() =>
  import("@/components/admin/sales-panel").then((m) => ({ default: m.SalesPanel })),
);
const AiSettingsPanel = lazy(() =>
  import("@/components/admin/ai-settings-panel").then((m) => ({ default: m.AiSettingsPanel })),
);
const TrialGrantPanel = lazy(() =>
  import("@/components/admin/trial-grant-panel").then((m) => ({ default: m.TrialGrantPanel })),
);
const TrialLicensesPanel = lazy(() =>
  import("@/components/admin/trial-licenses-panel").then((m) => ({ default: m.TrialLicensesPanel })),
);
const AdminAccessPanel = lazy(() =>
  import("@/components/admin/admin-access-panel").then((m) => ({ default: m.AdminAccessPanel })),
);
const BlockedIpsPanel = lazy(() =>
  import("@/components/admin/blocked-ips-panel").then((m) => ({ default: m.BlockedIpsPanel })),
);
const CategoriesCatalogPanel = lazy(() =>
  import("@/components/admin/categories-panel").then((m) => ({ default: m.CategoriesCatalogPanel })),
);
const ClosingPolicyPanel = lazy(() =>
  import("@/components/admin/closing-policy-panel").then((m) => ({ default: m.ClosingPolicyPanel })),
);
const ReopenRequestsPanel = lazy(() =>
  import("@/components/admin/reopen-requests-panel").then((m) => ({ default: m.ReopenRequestsPanel })),
);
const AuditLogsPanel = lazy(() =>
  import("@/components/admin/audit-logs-panel").then((m) => ({ default: m.AuditLogsPanel })),
);

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Central administrativa — GastoCerto" },
      {
        name: "description",
        content:
          "Central de controle da plataforma: contas, licenças, vendas, IA, suporte e auditoria.",
      },
      { property: "og:title", content: "Central administrativa — GastoCerto" },
      {
        property: "og:description",
        content:
          "Central de controle da plataforma: contas, licenças, vendas, IA, suporte e auditoria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const SECTIONS: AdminSection[] = [
  { id: "overview", label: "Visão geral", hint: "Indicadores e atalhos da operação", icon: LayoutDashboard },
  { id: "users", label: "Contas", hint: "Usuários, papéis e credenciais", icon: Users },
  { id: "business", label: "Negócio", hint: "MRR, churn, LTV e custo de IA", icon: TrendingUp, adminOnly: true },
  { id: "sales", label: "Vendas e pagamentos", hint: "Pedidos, Pix e reconciliação", icon: Wallet, adminOnly: true },
  { id: "plans", label: "Planos e preços", hint: "Limites e valores por plano", icon: CreditCard, adminOnly: true },
  { id: "licenses", label: "Licenças", hint: "Emissão, validade e revogação", icon: ShieldCheck, adminOnly: true },
  { id: "codes", label: "Códigos de clientes", hint: "Validade e tempo restante", icon: KeyRound, adminOnly: true },
  { id: "trials", label: "Testes e cortesias", hint: "Concessão e acompanhamento", icon: ClipboardList, adminOnly: true },
  { id: "ai", label: "IA e limites", hint: "Cotas, rate limit e alertas", icon: BrainCircuit, adminOnly: true },
  { id: "tickets", label: "Suporte", hint: "Fila de atendimento", icon: LifeBuoy, adminOnly: true },
  { id: "announcements", label: "Avisos globais", hint: "Comunicados na plataforma", icon: BellRing, adminOnly: true },
  { id: "categories", label: "Catálogo", hint: "Categorias da plataforma", icon: Tags, adminOnly: true },
  { id: "closing", label: "Fechamento", hint: "Política e liberações de meses", icon: Lock },
  { id: "audit", label: "Auditoria", hint: "Códigos, permissões e exportação", icon: FileClock },
  { id: "logs", label: "Logs administrativos", hint: "Trilha completa de ações", icon: ScrollText },
];

function AdminPage() {
  const { data: roles, isLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");
  const isStaff = isAdmin || (roles ?? []).includes("support");

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-4 p-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!isStaff) {
    window.location.href = "/painel";
    return null;
  }

  return <AdminConsole isAdmin={isAdmin} />;
}

function AdminConsole({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [active, setActive] = useState("overview");

  const sections = useMemo(
    () => SECTIONS.filter((section) => isAdmin || !section.adminOnly),
    [isAdmin],
  );

  const current = sections.some((section) => section.id === active) ? active : "overview";

  return (
    <AdminConsoleShell
      sections={sections}
      active={current}
      onSelect={setActive}
      operatorName={user?.email ?? "Operador"}
      role={isAdmin ? "Administrador" : "Suporte"}
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        {current === "overview" ? <AdminOverviewPanel isAdmin={isAdmin} onNavigate={setActive} /> : null}
        {current === "users" ? <UsersPanel isAdmin={isAdmin} /> : null}
        {current === "business" ? <BusinessDashboard /> : null}
        {current === "sales" ? <SalesPanel /> : null}
        {current === "plans" ? <PlanConfigsPanel /> : null}
        {current === "licenses" ? <LicensesPanel /> : null}
        {current === "codes" ? <ClientCodesPanel /> : null}
        {current === "trials" ? (
          <div className="space-y-4">
            <TrialGrantPanel />
            <TrialLicensesPanel />
          </div>
        ) : null}
        {current === "ai" ? <AiSettingsPanel /> : null}
        {current === "tickets" ? <SupportTicketsPanel /> : null}
        {current === "announcements" ? <AnnouncementsPanel /> : null}
        {current === "categories" ? <CategoriesCatalogPanel /> : null}
        {current === "closing" ? (
          <div className="space-y-4">
            <ClosingPolicyPanel />
            <ReopenRequestsPanel />
          </div>
        ) : null}
        {current === "audit" ? <AuditLogsPanel /> : null}
        {current === "security" ? (
          <div className="space-y-4">
            <AdminAccessPanel />
            <BlockedIpsPanel />
          </div>
        ) : null}
        {current === "logs" ? <LogsTable /> : null}
      </Suspense>
    </AdminConsoleShell>
  );
}

const LogsTable = lazy(() =>
  import("@/components/admin/logs-table").then((m) => ({ default: m.LogsTable })),
);

