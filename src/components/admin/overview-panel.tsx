import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Database,
  LifeBuoy,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { StatTile } from "@/components/finance/stat-tile";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminOverview } from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/format";

/** Visão geral da operação: indicadores, atalhos e últimas ações da equipe. */
export function AdminOverviewPanel({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate: (section: string) => void;
}) {
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    enabled: isAdmin,
    staleTime: 60_000,
    queryFn: () => adminOverview(),
  });

  const logs = useQuery({
    queryKey: ["admin", "logs", "recent"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("id, action, created_at, details")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const shortcuts = [
    { id: "users", label: "Gerenciar contas", icon: Users },
    { id: "business", label: "Métricas de negócio", icon: TrendingUp },
    { id: "licenses", label: "Licenças e códigos", icon: ShieldCheck },
    { id: "tickets", label: "Fila de suporte", icon: LifeBuoy },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 auto-cards-sm">
        <StatTile tone="brand" label="Usuários" value={String(overview.data?.totalUsers ?? 0)} icon={Users} />
        <StatTile
          tone="success"
          label="Contas ativas"
          value={String(overview.data?.activeUsers ?? 0)}
          icon={ShieldCheck}
        />
        <StatTile
          tone="warning"
          label="Novos (30 dias)"
          value={String(overview.data?.newUsers30d ?? 0)}
          icon={TrendingUp}
        />
        <StatTile
          tone="neutral"
          label="Lançamentos"
          value={String(overview.data?.totalTransactions ?? 0)}
          icon={Database}
        />
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Atalhos de operação
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.id}
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              onClick={() => onNavigate(shortcut.id)}
            >
              <shortcut.icon className="size-4 text-brand" />
              <span className="text-sm">{shortcut.label}</span>
              <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Últimas ações da equipe
        </h3>
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
          {(logs.data ?? []).length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">Nenhuma ação registrada ainda.</li>
          ) : (
            (logs.data ?? []).map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate text-sm font-medium">{log.action}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
