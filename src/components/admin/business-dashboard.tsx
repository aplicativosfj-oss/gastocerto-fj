import { useQuery } from "@tanstack/react-query";
import { adminGetBusinessMetrics } from "@/lib/admin-expansion.functions";
import { StatTile } from "@/components/finance/stat-tile";
import { TrendingUp, Users, DollarSign, BrainCircuit } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Loader2 } from "lucide-react";

export function BusinessDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin", "business-metrics"],
    queryFn: () => adminGetBusinessMetrics(),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const latest = metrics?.[0] || { mrr: 0, total_active_subscribers: 0, ai_cost_estimated: 0, revenue_gross: 0 };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 auto-cards-sm">
        <StatTile tone="brand" label="MRR (Mensal)" value={formatCurrency(latest.mrr)} icon={DollarSign} />
        <StatTile tone="success" label="Assinantes Ativos" value={String(latest.total_active_subscribers)} icon={Users} />
        <StatTile tone="warning" label="Custo Estimado IA" value={formatCurrency(latest.ai_cost_estimated)} icon={BrainCircuit} />
        <StatTile tone="neutral" label="Receita Bruta" value={formatCurrency(latest.revenue_gross)} icon={TrendingUp} />
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Simulador de Margem IA</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Lucro Bruto (Mensal)</span>
            <div className="text-xl font-bold">{formatCurrency(latest.mrr - latest.ai_cost_estimated)}</div>
            <p className="text-[10px] text-success">Margem: {latest.mrr > 0 ? ((latest.mrr - latest.ai_cost_estimated) / latest.mrr * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
