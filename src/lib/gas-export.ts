import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { durationLabel, type GasSummary } from "@/lib/gas-analytics";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function cell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function metricRows(summary: GasSummary): [string, string][] {
  return [
    ["Trocas registradas", String(summary.refillCount)],
    ["Total gasto", formatCurrency(summary.totalSpent)],
    ["Valor médio por botijão", formatCurrency(summary.averageAmount)],
    [
      "Duração média",
      summary.averageDays != null
        ? `${summary.averageDays.toLocaleString("pt-BR")} dias (~${summary.averageWeeks?.toLocaleString("pt-BR")} semanas · ~${summary.averageMonths?.toLocaleString("pt-BR")} mês(es))`
        : "—",
    ],
    [
      "Custo por dia",
      summary.averageCostPerDay != null ? formatCurrency(summary.averageCostPerDay) : "—",
    ],
    [
      "Custo médio por mês",
      summary.averageMonthlyCost != null ? formatCurrency(summary.averageMonthlyCost) : "—",
    ],
    ["Menor duração", summary.shortestDays != null ? `${summary.shortestDays} dias` : "—"],
    ["Maior duração", summary.longestDays != null ? `${summary.longestDays} dias` : "—"],
    [
      "Botijão atual comprado em",
      summary.lastRefillDate ? formatDate(summary.lastRefillDate) : "—",
    ],
    ["Em uso há", summary.daysSinceLast != null ? `${summary.daysSinceLast} dias` : "—"],
    [
      "Próxima troca prevista",
      summary.nextRefillDate ? formatDate(summary.nextRefillDate) : "—",
    ],
    [
      "Dias até a próxima troca",
      summary.daysUntilNext != null ? String(summary.daysUntilNext) : "—",
    ],
  ];
}

const CYCLE_HEADER = ["Compra", "Acabou em", "Duração", "Valor", "Custo/dia", "Revenda"];

function cycleRows(summary: GasSummary) {
  return [...summary.cycles]
    .reverse()
    .map((cycle) => [
      formatDate(cycle.startDate),
      cycle.endDate ? formatDate(cycle.endDate) : "Em uso",
      durationLabel(cycle.days),
      formatCurrency(cycle.amount),
      cycle.costPerDay != null ? formatCurrency(cycle.costPerDay) : "—",
      cycle.supplier ?? "—",
    ]);
}

/** Métricas + histórico do botijão em CSV (separador ponto e vírgula). */
export function exportGasCsv(summary: GasSummary) {
  const lines = [
    cell("GastoCerto — Botijão de gás"),
    cell(`Gerado em ${formatDateTime(new Date().toISOString())}`),
    "",
    [cell("Indicador"), cell("Valor")].join(";"),
    ...metricRows(summary).map(([label, value]) => [cell(label), cell(value)].join(";")),
    "",
    CYCLE_HEADER.map(cell).join(";"),
    ...cycleRows(summary).map((row) => row.map(cell).join(";")),
  ];
  download(
    new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    "botijao-gas-gastocerto.csv",
  );
}

/** Relatório em PDF com métricas, gráficos (barras/linha) e histórico completo. */
export async function exportGasPdf(summary: GasSummary) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(15);
  doc.text("GastoCerto — Relatório do botijão de gás", 40, 40);
  doc.setFontSize(9);
  doc.text(`Gerado em ${formatDateTime(new Date().toISOString())}`, 40, 56);

  autoTable(doc, {
    startY: 72,
    head: [["Indicador", "Valor"]],
    body: metricRows(summary),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [16, 45, 70] },
  });

  let cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  const closed = summary.closed;
  if (closed.length) {
    doc.setFontSize(11);
    doc.text("Quantos dias cada botijão durou", 40, cursor);
    cursor += 10;

    const chartWidth = pageWidth - 80;
    const chartHeight = 110;
    const maxDays = Math.max(...closed.map((cycle) => cycle.days ?? 0), 1);
    const gap = 6;
    const barWidth = Math.max(6, (chartWidth - gap * closed.length) / closed.length);

    doc.setDrawColor(200);
    doc.line(40, cursor + chartHeight, 40 + chartWidth, cursor + chartHeight);
    doc.setFillColor(16, 110, 90);
    closed.forEach((cycle, index) => {
      const height = ((cycle.days ?? 0) / maxDays) * (chartHeight - 12);
      const x = 40 + index * (barWidth + gap);
      doc.rect(x, cursor + chartHeight - height, barWidth, height, "F");
    });
    doc.setFontSize(7);
    doc.text(`máx. ${maxDays} dias`, 40, cursor - 2);
    cursor += chartHeight + 28;
  }

  const priced = summary.cycles.filter((cycle) => cycle.amount > 0);
  if (priced.length > 1) {
    if (cursor > 620) {
      doc.addPage();
      cursor = 60;
    }
    doc.setFontSize(11);
    doc.text("Evolução do preço do botijão", 40, cursor);
    cursor += 10;

    const chartWidth = pageWidth - 80;
    const chartHeight = 110;
    const values = priced.map((cycle) => cycle.amount);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;

    doc.setDrawColor(200);
    doc.line(40, cursor + chartHeight, 40 + chartWidth, cursor + chartHeight);
    doc.setDrawColor(220, 110, 60);
    doc.setLineWidth(1.5);
    priced.forEach((cycle, index) => {
      const x = 40 + (index / (priced.length - 1)) * chartWidth;
      const y = cursor + chartHeight - ((cycle.amount - min) / span) * (chartHeight - 14) - 7;
      if (index > 0) {
        const prev = priced[index - 1]!;
        const px = 40 + ((index - 1) / (priced.length - 1)) * chartWidth;
        const py = cursor + chartHeight - ((prev.amount - min) / span) * (chartHeight - 14) - 7;
        doc.line(px, py, x, y);
      }
    });
    doc.setLineWidth(0.5);
    doc.setFontSize(7);
    doc.text(`${formatCurrency(min)} — ${formatCurrency(max)}`, 40, cursor - 2);
    cursor += chartHeight + 28;
  }

  autoTable(doc, {
    startY: cursor,
    head: [CYCLE_HEADER],
    body: cycleRows(summary),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 45, 70] },
  });

  doc.save("botijao-gas-gastocerto.pdf");
}
