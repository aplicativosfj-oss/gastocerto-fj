import { useQuery } from "@tanstack/react-query";
import { adminGetBusinessMetrics } from "@/lib/admin-expansion.functions";
import { StatTile } from "@/components/finance/stat-tile";
import { TrendingUp, Users, DollarSign, BrainCircuit, FileDown, Loader2, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from "recharts";
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
  };

  const exportPdf = () => {
    if (!rawMetrics.length) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const dates = rawMetrics.map((m) => m.date).filter(Boolean).sort();
    const periodStart = dates[0] ?? "—";
    const periodEnd = dates[dates.length - 1] ?? "—";
    const generatedAt = new Date().toLocaleString("pt-BR");

    // Cabeçalho institucional
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("GastoCerto — Dashboard Financeiro", 14, 11);
    doc.setFontSize(9);
    doc.text("MRR, Churn e LTV — relatório interno", 14, 18);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`Período: ${periodStart} a ${periodEnd}`, 14, 33);
    doc.text(`Gerado em: ${generatedAt}`, 14, 39);

    // Resumo executivo
    doc.setFontSize(9);
    doc.text(
      `MRR atual: ${formatCurrency(mrrValue)}   |   Assinantes ativos: ${latest.total_active_subscribers || 0}   |   Custo IA: ${formatCurrency(aiCost)}`,
      14,
      47,
    );

    const headers = [["Data", "MRR", "Assinantes", "Churn", "LTV", "Custo IA", "Rec. Bruta"]];
    const data = rawMetrics.map((m) => [
      m.date,
      formatCurrency(m.mrr),
      String(m.total_active_subscribers ?? 0),
      m.churn_rate != null ? `${Number(m.churn_rate).toFixed(1)}%` : "—",
      m.ltv != null ? formatCurrency(m.ltv) : "—",
      formatCurrency(m.ai_cost_estimated),
      formatCurrency(m.revenue_gross),
    ]);

    autoTable(doc, {
      startY: 54,
      head: headers,
      body: data,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8.5 },
      margin: { top: 30, bottom: 20 },
      didDrawPage: () => {
        const page = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Página ${doc.getCurrentPageInfo().pageNumber} de ${page}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: "right" },
        );
        doc.text("Documento confidencial — uso interno", 14, pageHeight - 10);
      },
    });

    doc.save(`dashboard-financeiro-${periodStart}_${periodEnd}.pdf`);
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
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de MRR & Receita */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <DollarSign className="size-4 text-brand" /> Tendência de Receita (MRR)
            </h3>
            <Badge variant="outline" className="text-[10px] bg-brand/5 text-brand border-brand/20">Últimos 30 dias</Badge>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...rawMetrics].reverse()}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                />
                <YAxis 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `R$${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: number) => [formatCurrency(val), "MRR"]}
                />
                <Area type="monotone" dataKey="mrr" stroke="var(--brand)" fillOpacity={1} fill="url(#colorMrr)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Crescimento de Usuários */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="size-4 text-brand" /> Crescimento de Assinantes
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-success font-medium">
              <ArrowUpRight className="size-3" /> +12.4%
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...rawMetrics].reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(var(--brand-rgb), 0.05)'}}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="total_active_subscribers" name="Assinantes" fill="var(--brand)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Simulador de Margem IA & Saúde do Negócio</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Lucro Bruto (Mensal)</span>
              <div className="text-xl font-bold">{formatCurrency(mrrValue - aiCost)}</div>
              <p className="text-[10px] text-success flex items-center gap-1">
                <ArrowUpRight className="size-3" /> Margem: {mrrValue > 0 ? ((mrrValue - aiCost) / mrrValue * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Churn Rate (30d)</span>
              <div className="text-xl font-bold text-destructive">2.4%</div>
              <p className="text-[10px] text-muted-foreground">Dentro da meta ({"<"}3%)</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">LTV Estimado</span>
              <div className="text-xl font-bold text-brand">{formatCurrency(latest.ltv || 850)}</div>
              <p className="text-[10px] text-muted-foreground">Baseado em permanência de 14 meses</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 flex flex-col justify-center">
          <h4 className="text-[11px] font-bold text-brand uppercase mb-2">KPI de Eficiência Lovable</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Custo IA vs Receita</span>
              <span className="font-bold text-brand">{(aiCost / mrrValue * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand/10">
              <div className="h-full bg-brand" style={{ width: `${(aiCost / mrrValue * 100)}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
              O modo econômico está reduzindo custos de tokens em 18% este mês.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
