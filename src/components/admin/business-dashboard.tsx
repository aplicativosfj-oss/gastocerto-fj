import { useQuery } from "@tanstack/react-query";
import { adminGetBusinessMetrics } from "@/lib/admin-expansion.functions";
import { StatTile } from "@/components/finance/stat-tile";
import { TrendingUp, Users, DollarSign, BrainCircuit, FileDown, Loader2, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function BusinessDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin", "business-metrics"],
    queryFn: () => adminGetBusinessMetrics(),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const rawMetrics = (metrics || []) as any[];
  const latest = rawMetrics[0] || { mrr: 0, total_active_subscribers: 0, ai_cost_estimated: 0, revenue_gross: 0 };

  const mrrValue = Number(latest.mrr || 0);
  const aiCost = Number(latest.ai_cost_estimated || 0);

  const exportCsv = () => {
    if (!rawMetrics.length) return;
    const headers = ["Data", "MRR", "Assinantes Ativos", "Custo IA", "Receita Bruta"];
    const rows = rawMetrics.map(m => [
      m.date,
      m.mrr,
      m.total_active_subscribers,
      m.ai_cost_estimated,
      m.revenue_gross
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `business-metrics-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso");
  const exportPdf = () => {
    if (!rawMetrics.length) return;
    const doc = new jsPDF();
    doc.text("Relatório de Métricas de Negócio - GastoCerto", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

    const headers = [["Data", "MRR", "Assinantes", "Custo IA", "Rec. Bruta"]];
    const data = rawMetrics.map(m => [
      m.date,
      formatCurrency(m.mrr),
      m.total_active_subscribers,
      formatCurrency(m.ai_cost_estimated),
      formatCurrency(m.revenue_gross)
    ]);

    autoTable(doc, {
      startY: 30,
      head: headers,
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] } // Brand Emerald
    });

    doc.save(`business-metrics-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Métricas de Negócio</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
            <FileDown className="size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
            <FileText className="size-4" />
            PDF
          </Button>
        </div>
      </div>
      <div className="grid gap-3 auto-cards-sm">
        <StatTile tone="brand" label="MRR (Mensal)" value={formatCurrency(mrrValue)} icon={DollarSign} />
        <StatTile tone="success" label="Assinantes Ativos" value={String(latest.total_active_subscribers || 0)} icon={Users} />
        <StatTile tone="warning" label="Custo Estimado IA" value={formatCurrency(aiCost)} icon={BrainCircuit} />
        <StatTile tone="neutral" label="Receita Bruta" value={formatCurrency(Number(latest.revenue_gross || 0))} icon={TrendingUp} />
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Simulador de Margem IA</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Lucro Bruto (Mensal)</span>
            <div className="text-xl font-bold">{formatCurrency(mrrValue - aiCost)}</div>
            <p className="text-[10px] text-success">Margem: {mrrValue > 0 ? ((mrrValue - aiCost) / mrrValue * 100).toFixed(1) : '0.0'}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
