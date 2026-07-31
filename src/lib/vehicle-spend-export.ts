import { formatCurrency, formatDate } from "@/lib/format";
import type { VehicleSpend } from "@/lib/vehicle-spend";

/**
 * Relatório de gastos com veículo em PDF, respeitando os filtros da tela e
 * detalhando os totais por categoria e por subcategoria.
 */
export async function exportVehicleSpendPdf(
  rows: VehicleSpend[],
  filters: { from: string; to: string; vehicleLabel: string; period: string },
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(15);
  doc.text("GastoCerto — Gastos com veículo", 40, 40);
  doc.setFontSize(9);
  doc.text(
    `Período: ${formatDate(filters.from)} a ${formatDate(filters.to)} (${filters.period}) · Veículo: ${filters.vehicleLabel}`,
    40,
    56,
  );
  doc.text(`Gerado em ${formatDate(new Date().toISOString().slice(0, 10))}`, 40, 70);

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const count = rows.reduce((sum, row) => sum + row.count, 0);

  autoTable(doc, {
    startY: 86,
    head: [["Veículo", "Placa", "Lançamentos", "Total"]],
    body: rows.map((row) => [
      row.vehicleName,
      row.vehicle?.plate ?? "—",
      String(row.count),
      formatCurrency(row.total),
    ]),
    foot: [["TOTAL", "", String(count), formatCurrency(total)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 42, 58] },
    footStyles: { fillColor: [235, 238, 241], textColor: 20 },
  });

  for (const row of rows) {
    const previous = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    let cursor = (previous?.finalY ?? 86) + 24;
    if (cursor > 700) {
      doc.addPage();
      cursor = 60;
    }

    doc.setFontSize(11);
    doc.text(`${row.vehicleName} — ${formatCurrency(row.total)}`, 40, cursor);

    autoTable(doc, {
      startY: cursor + 8,
      head: [["Categoria", "Lançamentos", "Total"]],
      body: row.categories.map((slice) => [
        slice.name,
        String(slice.count),
        formatCurrency(slice.total),
      ]),
      foot: [["Total por categoria", String(row.count), formatCurrency(row.total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 101, 82] },
      footStyles: { fillColor: [235, 238, 241], textColor: 20 },
    });

    const afterCategories = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    autoTable(doc, {
      startY: (afterCategories?.finalY ?? cursor) + 14,
      head: [["Subcategoria", "Lançamentos", "Total"]],
      body: row.subCategories.map((slice) => [
        slice.name,
        String(slice.count),
        formatCurrency(slice.total),
      ]),
      foot: [["Total por subcategoria", String(row.count), formatCurrency(row.total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 63, 4] },
      footStyles: { fillColor: [235, 238, 241], textColor: 20 },
    });
  }

  doc.save(`gastos-veiculo-${filters.from}-a-${filters.to}.pdf`);
}
