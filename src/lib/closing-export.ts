import { formatCurrency, formatDate } from "@/lib/format";
import type { MonthBalance } from "@/lib/closing";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function money(value: number) {
  return value.toFixed(2).replace(".", ",");
}

/** Balancete completo em CSV: saldo inicial, entradas, saídas e saldo final. */
export function exportBalanceCsv(rows: MonthBalance[]) {
  const header = [
    "Competência",
    "Início",
    "Fim",
    "Saldo inicial",
    "Entradas",
    "Saídas",
    "Resultado",
    "Saldo final",
    "Lançamentos",
    "Situação",
  ];
  const lines = rows.map((row) =>
    [
      row.label,
      row.range.start,
      row.range.end,
      money(row.opening),
      money(row.income),
      money(row.expense),
      money(row.result),
      money(row.closing),
      row.count,
      row.closed ? "Fechado" : "Aberto",
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = ["\uFEFF" + header.map(csvCell).join(";"), ...lines].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "balancete-gastocerto.csv");
}

/** Balancete completo em PDF. */
export async function exportBalancePdf(rows: MonthBalance[]) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(15);
  doc.text("GastoCerto — Balancete mensal", 40, 40);
  doc.setFontSize(9);
  doc.text(`Gerado em ${formatDate(new Date().toISOString().slice(0, 10))}`, 40, 56);

  autoTable(doc, {
    startY: 72,
    head: [
      [
        "Competência",
        "Período",
        "Saldo inicial",
        "Entradas",
        "Saídas",
        "Resultado",
        "Saldo final",
        "Lanç.",
        "Situação",
      ],
    ],
    body: rows.map((row) => [
      row.label,
      `${formatDate(row.range.start)} a ${formatDate(row.range.end)}`,
      formatCurrency(row.opening),
      formatCurrency(row.income),
      formatCurrency(row.expense),
      formatCurrency(row.result),
      formatCurrency(row.closing),
      String(row.count),
      row.closed ? "Fechado" : "Aberto",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 42, 69], textColor: 255 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  doc.save("balancete-gastocerto.pdf");
}
