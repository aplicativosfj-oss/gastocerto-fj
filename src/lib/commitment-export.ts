import type { CommitmentSchedule } from "@/lib/commitment-schedule";
import { INSTALLMENT_STATUS_LABEL } from "@/lib/commitment-schedule";
import type { Commitment } from "@/lib/commitments";
import { formatCurrency, formatDate } from "@/lib/format";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function money(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase() || "carne";
}

/** Linhas do carnê com saldo devedor acumulado (decrescente). */
function rows(schedule: CommitmentSchedule) {
  let remaining = schedule.total;
  return schedule.installments.map((item) => {
    remaining = Math.max(remaining - item.amount, 0);
    return { item, balance: remaining };
  });
}

/** Carnê em CSV: vencimento, parcela, pago, status e saldo. */
export function exportScheduleCsv(commitment: Commitment, schedule: CommitmentSchedule) {
  const header = ["Parcela", "Vencimento", "Valor da parcela", "Valor pago", "Situação", "Saldo devedor"];
  const lines = rows(schedule).map(({ item, balance }) =>
    [
      `${item.number}/${schedule.installments.length}`,
      item.dueDate.split("-").reverse().join("/"),
      money(item.amount),
      money(item.paidAmount),
      INSTALLMENT_STATUS_LABEL[item.status],
      money(balance),
    ]
      .map(csvCell)
      .join(";"),
  );
  const csv = ["\uFEFF" + header.map(csvCell).join(";"), ...lines].join("\n");
  download(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `carne-${slug(commitment.name)}.csv`,
  );
}

/** Carnê em PDF com cabeçalho do compromisso e totais. */
export async function exportSchedulePdf(commitment: Commitment, schedule: CommitmentSchedule) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(15);
  doc.text("GastoCerto — Carnê de parcelas", 40, 40);
  doc.setFontSize(10);
  doc.text(commitment.name, 40, 58);
  doc.setFontSize(9);
  doc.text(
    [
      commitment.creditor ? `Credor: ${commitment.creditor}` : null,
      `Parcelas: ${schedule.paidCount}/${schedule.installments.length}`,
      `Total: ${formatCurrency(schedule.total)}`,
      `Falta pagar: ${formatCurrency(schedule.remaining)}`,
    ]
      .filter(Boolean)
      .join("  ·  "),
    40,
    73,
  );
  doc.text(`Gerado em ${formatDate(new Date())}`, 40, 87);

  autoTable(doc, {
    startY: 100,
    head: [["Parcela", "Vencimento", "Valor", "Pago", "Situação", "Saldo devedor"]],
    body: rows(schedule).map(({ item, balance }) => [
      `${item.number}/${schedule.installments.length}`,
      formatDate(`${item.dueDate}T12:00:00`),
      formatCurrency(item.amount),
      formatCurrency(item.paidAmount),
      INSTALLMENT_STATUS_LABEL[item.status],
      formatCurrency(balance),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [15, 42, 69], textColor: 255 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      5: { halign: "right" },
    },
  });

  doc.save(`carne-${slug(commitment.name)}.pdf`);
}
