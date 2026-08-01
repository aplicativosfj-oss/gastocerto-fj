import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Database,
  LifeBuoy,
  ShieldCheck,
  TrendingUp,
  Users,
  CreditCard,
  Target,
  FileText
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
    { id: "sales", label: "Vendas e pagamentos", icon: CreditCard },
    { id: "business", label: "Dashboard de Negócio", icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand">Central de Comando GastoCerto</h3>
            <p className="text-[11px] text-muted-foreground italic">"Decisões orientadas a dados para o sucesso da plataforma."</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => onNavigate("business")} className="gap-2">
             <TrendingUp className="size-4" /> Relatórios
           </Button>
        </div>
      </div>

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

      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="size-3" /> Últimas ações da equipe
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
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
           <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do Ecossistema</h3>
           <div className="space-y-3">
             <div className="flex items-center justify-between text-xs">
               <span className="text-muted-foreground">Taxa de Conversão (Pix)</span>
               <span className="font-bold">Em breve no Dashboard</span>
             </div>
             <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
               <div className="h-full w-[65%] bg-brand" />
             </div>
             <p className="text-[10px] text-muted-foreground leading-relaxed">
               A seção "Negócio" agora centraliza o monitoramento de MRR, Churn e LTV. Use os atalhos acima para acessar as métricas completas.
             </p>
           </div>
        </div>
      </section>
    </div>
  );
}
