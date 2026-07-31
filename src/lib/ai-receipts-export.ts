import { formatDateTime } from "@/lib/format";
import type { AiReceipt } from "@/lib/ai-guard";

const REASON_LABEL: Record<string, string> = {
  admin: "Administrador",
  paid_license: "Licença paga ativa",
  paid_plan: "Plano pago",
  trial_active: "Período de teste vigente",
  trial_expired: "Período de teste expirado",
  trial_plan: "Plano de teste (trial)",
  free_plan: "Plano gratuito",
  no_plan: "Sem plano vinculado",
  monthly_quota: "Limite mensal atingido",
  rate_limited: "Excesso de tentativas",
};

const ACTION_LABEL: Record<string, string> = {
  allowed: "Executada",
  blocked: "Bloqueada",
  quota_exceeded: "Limite excedido",
  rate_limited: "Excesso de tentativas",
};

export function receiptActionLabel(action: string) {
  return ACTION_LABEL[action] ?? action;
}

export function receiptReasonLabel(reason: string) {
  return REASON_LABEL[reason] ?? reason;
}

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

const HEADER = [
  "Data",
  "Situação",
  "Plano",
  "Motivo / bloqueio",
  "Créditos estimados",
  "Tokens",
  "Modelo",
  "Pergunta",
];

function rowsOf(receipts: AiReceipt[]) {
  return receipts.map((receipt) => [
    formatDateTime(receipt.createdAt),
    receiptActionLabel(receipt.action),
    receipt.planSlug ?? "—",
    receipt.allowed
      ? `Liberada: ${receiptReasonLabel(receipt.reason)}`
      : `Bloqueio: ${receiptReasonLabel(receipt.reason)}`,
    receipt.credits.toFixed(4).replace(".", ","),
    String(receipt.totalTokens),
    receipt.model ?? "—",
    receipt.question ?? "—",
  ]);
}

/** Recibos por execução em CSV (Excel-friendly, separador ponto e vírgula). */
export function exportAiReceiptsCsv(receipts: AiReceipt[]) {
  const lines = rowsOf(receipts).map((row) => row.map(cell).join(";"));
  const csv = ["\uFEFF" + HEADER.map(cell).join(";"), ...lines].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "recibos-ia-gastocerto.csv");
}

/** Recibos por execução em PDF, com totais de créditos e tokens. */
export async function exportAiReceiptsPdf(receipts: AiReceipt[]) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(15);
  doc.text("GastoCerto — Recibos do Consultor de IA", 40, 40);
  doc.setFontSize(9);
  doc.text(`Gerado em ${formatDateTime(new Date().toISOString())}`, 40, 56);

  const credits = receipts.reduce((sum, item) => sum + item.credits, 0);
  const tokens = receipts.reduce((sum, item) => sum + item.totalTokens, 0);
  doc.text(
    `${receipts.length} execução(ões) · ${credits.toFixed(3)} crédito(s) estimado(s) · ${tokens.toLocaleString("pt-BR")} tokens`,
    40,
    70,
  );

  autoTable(doc, {
    startY: 86,
    head: [HEADER],
    body: rowsOf(receipts),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [16, 45, 70] },
    columnStyles: { 7: { cellWidth: 200 } },
  });

  doc.save("recibos-ia-gastocerto.pdf");
}
