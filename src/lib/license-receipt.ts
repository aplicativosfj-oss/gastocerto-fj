import { jsPDF } from "jspdf";

import { formatCurrency } from "@/lib/format";

export type LicenseReceiptData = {
  licenseKey: string;
  planName: string;
  billingCycle: string;
  amount: number;
  status: string;
  issuedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  holderName: string | null;
  cpf: string | null;
  email: string | null;
  aiIncluded: boolean;
};

function maskCpf(cpf: string | null) {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function dateLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Gera o comprovante da compra da assinatura em PDF, com CPF, chave de licença
 * e validade — pronto para guardar ou enviar ao suporte.
 */
export function downloadLicenseReceipt(data: LicenseReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GastoCerto — Comprovante de assinatura", marginX, y);

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR")} · documento sem valor fiscal`,
    marginX,
    y,
  );

  y += 26;
  doc.setDrawColor(200);
  doc.line(marginX, y, 595 - marginX, y);

  const rows: Array<[string, string]> = [
    ["Titular", data.holderName ?? "—"],
    ["CPF", maskCpf(data.cpf)],
    ["E-mail", data.email ?? "—"],
    ["Chave de licença", data.licenseKey],
    ["Plano contratado", data.planName],
    ["Periodicidade", data.billingCycle === "annual" ? "Anual (12 meses)" : "Mensal"],
    ["Valor pago", formatCurrency(data.amount)],
    ["Situação", data.status],
    ["Emissão", dateLabel(data.issuedAt)],
    ["Ativação", dateLabel(data.activatedAt)],
    ["Válido até", dateLabel(data.expiresAt)],
    ["Consultor de IA", data.aiIncluded ? "Incluído" : "Não incluído"],
  ];

  y += 24;
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), marginX + 130, y);
    y += 18;
  }

  y += 12;
  doc.setDrawColor(200);
  doc.line(marginX, y, 595 - marginX, y);
  y += 20;
  doc.setFontSize(9);
  doc.text(
    "Itens liberados: lançamentos ilimitados, veículos e combustível, botijão de gás,",
    marginX,
    y,
  );
  y += 14;
  doc.text(
    "compromissos e parcelas, orçamentos, relatórios avançados, calendário e alertas.",
    marginX,
    y,
  );
  if (data.aiIncluded) {
    y += 14;
    doc.text("Consultor de IA integrado, com recibo de consumo por execução.", marginX, y);
  }

  doc.save(`comprovante-${data.licenseKey}.pdf`);
}
