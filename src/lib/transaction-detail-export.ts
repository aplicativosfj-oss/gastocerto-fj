import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PAYMENT_METHODS, TRANSACTION_STATUS, EXPENSE_TYPES, labelFor } from "@/lib/finance";
import type { NoteHistoryEntry } from "@/lib/transaction-notes";
import { NOTE_FIELD_LABEL } from "@/lib/transaction-notes";
import type { Transaction } from "@/lib/transactions";

function slug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase() || "lancamento"
  );
}

/** Ficha do lançamento em PDF, para compartilhar ou arquivar. */
export async function exportTransactionPdf(
  transaction: Transaction,
  options: { categoryName?: string; history?: NoteHistoryEntry[] } = {},
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const isIncome = transaction.transaction_type === "income";
  const doc = new JsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(15);
  doc.text("GastoCerto — Ficha do lançamento", 40, 42);
  doc.setFontSize(11);
  doc.text(transaction.description, 40, 62);
  doc.setFontSize(9);
  doc.text(`Gerado em ${formatDateTime(new Date())}`, 40, 78);

  autoTable(doc, {
    startY: 94,
    head: [["Informação", "Detalhe"]],
    body: [
      ["Tipo", isIncome ? "Receita" : "Despesa"],
      ["Valor", `${isIncome ? "+" : "-"}${formatCurrency(Number(transaction.amount))}`],
      ["Data", formatDate(transaction.transaction_date)],
      ["Categoria", options.categoryName ?? "Sem categoria"],
      ["Situação", labelFor(TRANSACTION_STATUS, transaction.status)],
      ["Forma de pagamento", labelFor(PAYMENT_METHODS, transaction.payment_method)],
      ...(isIncome
        ? []
        : [["Tipo de despesa", labelFor(EXPENSE_TYPES, transaction.expense_type)] as string[]]),
      ["Estabelecimento", transaction.merchant_name ?? "—"],
      ["Vencimento", transaction.due_date ? formatDate(transaction.due_date) : "—"],
      ["Pagamento", transaction.payment_date ? formatDate(transaction.payment_date) : "—"],
      [
        "Parcela",
        transaction.total_installments
          ? `${transaction.installment_number ?? 1} de ${transaction.total_installments}`
          : "—",
      ],
      ["Anotações", transaction.notes ?? "—"],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [15, 42, 69], textColor: 255 },
    columnStyles: { 0: { cellWidth: 140, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
  });

  const history = options.history ?? [];
  if (history.length > 0) {
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 300;
    doc.setFontSize(11);
    doc.text("Histórico de alterações", 40, lastY + 26);
    autoTable(doc, {
      startY: lastY + 36,
      head: [["Data e hora", "Campo", "Antes", "Depois"]],
      body: history.map((entry) => [
        formatDateTime(entry.changed_at),
        NOTE_FIELD_LABEL[entry.field] ?? entry.field,
        entry.old_value ?? "—",
        entry.new_value ?? "—",
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 42, 69], textColor: 255 },
    });
  }

  doc.save(`lancamento-${transaction.transaction_date}-${slug(transaction.description)}.pdf`);
}
