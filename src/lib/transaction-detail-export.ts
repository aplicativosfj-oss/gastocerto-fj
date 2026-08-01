import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PAYMENT_METHODS, TRANSACTION_STATUS, EXPENSE_TYPES, labelFor } from "@/lib/finance";
import type { NoteHistoryEntry } from "@/lib/transaction-notes";
import { NOTE_FIELD_LABEL } from "@/lib/transaction-notes";
import type { Transaction } from "@/lib/transactions";
import {
  buildPdfFilename,
  readPdfPreferences,
  type PdfPreferences,
} from "@/lib/pdf-preferences";

/** Ficha do lançamento em PDF, para compartilhar ou arquivar. */
export async function exportTransactionPdf(
  transaction: Transaction,
  options: {
    categoryName?: string;
    history?: NoteHistoryEntry[];
    preferences?: PdfPreferences;
  } = {},
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const prefs = options.preferences ?? readPdfPreferences();
  const isIncome = transaction.transaction_type === "income";
  const categoryName = options.categoryName ?? "Sem categoria";
  const merchant = transaction.merchant_name ?? "";
  const doc = new JsPDF({
    unit: "pt",
    format: prefs.pageSize,
    orientation: prefs.orientation,
  });

  doc.setFontSize(15);
  doc.text("GastoCerto — Ficha do lançamento", 40, 42);
  doc.setFontSize(11);
  // Título mantém sempre categoria, data e estabelecimento.
  doc.text(
    `${categoryName} · ${formatDate(transaction.transaction_date)} · ${merchant || "sem estabelecimento"}`,
    40,
    62,
  );
  doc.setFontSize(10);
  doc.text(transaction.description, 40, 78);
  doc.setFontSize(9);
  doc.text(`Gerado em ${formatDateTime(new Date())}`, 40, 94);

  autoTable(doc, {
    startY: 110,
    head: [["Informação", "Detalhe"]],
    body: [
      ["Tipo", isIncome ? "Receita" : "Despesa"],
      ["Valor", `${isIncome ? "+" : "-"}${formatCurrency(Number(transaction.amount))}`],
      ["Data", formatDate(transaction.transaction_date)],
      ["Categoria", categoryName],
      ["Situação", labelFor(TRANSACTION_STATUS, transaction.status)],
      ["Forma de pagamento", labelFor(PAYMENT_METHODS, transaction.payment_method)],
      ...(isIncome
        ? []
        : [["Tipo de despesa", labelFor(EXPENSE_TYPES, transaction.expense_type)] as string[]]),
      ["Estabelecimento", merchant || "—"],
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

  if (prefs.watermark) {
    const text = prefs.watermarkText.trim() || "Controle Gastos";
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.saveGraphicsState();
      const gState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState;
      (doc as unknown as { setGState: (s: unknown) => void }).setGState(new gState({ opacity: 0.12 }));
      doc.setTextColor(15, 42, 69);
      doc.setFontSize(60);
      doc.text(text, width / 2, height / 2, { align: "center", angle: 35 });
      doc.restoreGraphicsState();
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(
    buildPdfFilename(prefs.filenamePattern, {
      categoria: categoryName,
      data: transaction.transaction_date,
      estabelecimento: merchant || "sem-estabelecimento",
      descricao: transaction.description,
      valor: String(transaction.amount),
    }),
  );
}
