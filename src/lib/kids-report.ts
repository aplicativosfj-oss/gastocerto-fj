import { dependentIdFromTags, type Dependent } from "@/lib/dependents";
import { toCents } from "@/lib/finance";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

type Txn = {
  transaction_type: string;
  amount: number | string;
  tags: string[] | null;
  transaction_date: string;
  description?: string | null;
};

export type KidsPeriodRow = {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  running: number;
};

export type KidsReport = {
  who: string;
  from: string;
  to: string;
  income: number;
  expense: number;
  balance: number;
  weeks: KidsPeriodRow[];
  months: KidsPeriodRow[];
  entries: { date: string; type: string; description: string; amount: number }[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

/** Semana ISO (segunda a domingo) usada como chave de agrupamento. */
function weekKey(date: Date) {
  const ref = new Date(date.getTime());
  const day = (ref.getDay() + 6) % 7;
  ref.setDate(ref.getDate() - day);
  return { key: `${ref.getFullYear()}-W${pad(weekNumber(ref))}`, start: new Date(ref.getTime()) };
}

function weekNumber(monday: Date) {
  const firstJan = new Date(monday.getFullYear(), 0, 1);
  const diff = Math.floor((monday.getTime() - firstJan.getTime()) / 86_400_000);
  return Math.floor(diff / 7) + 1;
}

/** Consolida receitas, despesas e evolução do saldo de uma criança. */
export function buildKidsReport(
  dependent: Dependent,
  transactions: Txn[],
  from: string,
  to: string,
): KidsReport {
  const mine = transactions
    .filter((row) => dependentIdFromTags(row.tags) === dependent.id)
    .filter((row) => row.transaction_date >= from && row.transaction_date <= to)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  const weekMap = new Map<string, KidsPeriodRow>();
  const monthMap = new Map<string, KidsPeriodRow>();
  let income = 0;
  let expense = 0;

  for (const row of mine) {
    const value = Number(row.amount) || 0;
    const date = parseDate(row.transaction_date);
    const isIncome = row.transaction_type === "income";
    if (isIncome) income = toCents(income + value);
    else expense = toCents(expense + value);

    const week = weekKey(date);
    const end = new Date(week.start.getTime());
    end.setDate(end.getDate() + 6);
    const weekRow =
      weekMap.get(week.key) ??
      ({
        key: week.key,
        label: `${pad(week.start.getDate())}/${pad(week.start.getMonth() + 1)} a ${pad(end.getDate())}/${pad(end.getMonth() + 1)}`,
        income: 0,
        expense: 0,
        balance: 0,
        running: 0,
      } satisfies KidsPeriodRow);
    if (isIncome) weekRow.income = toCents(weekRow.income + value);
    else weekRow.expense = toCents(weekRow.expense + value);
    weekMap.set(week.key, weekRow);

    const mKey = row.transaction_date.slice(0, 7);
    const monthRow =
      monthMap.get(mKey) ??
      ({
        key: mKey,
        label: `${mKey.slice(5, 7)}/${mKey.slice(0, 4)}`,
        income: 0,
        expense: 0,
        balance: 0,
        running: 0,
      } satisfies KidsPeriodRow);
    if (isIncome) monthRow.income = toCents(monthRow.income + value);
    else monthRow.expense = toCents(monthRow.expense + value);
    monthMap.set(mKey, monthRow);
  }

  const finish = (rows: KidsPeriodRow[]) => {
    let running = 0;
    return rows
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => {
        row.balance = toCents(row.income - row.expense);
        running = toCents(running + row.balance);
        row.running = running;
        return row;
      });
  };

  return {
    who: dependent.nickname?.trim() || dependent.name,
    from,
    to,
    income,
    expense,
    balance: toCents(income - expense),
    weeks: finish([...weekMap.values()]),
    months: finish([...monthMap.values()]),
    entries: mine.map((row) => ({
      date: row.transaction_date,
      type: row.transaction_type === "income" ? "Ganho" : "Gasto",
      description: row.description?.trim() || "Lançamento",
      amount: Number(row.amount) || 0,
    })),
  };
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

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

const PERIOD_HEADER = ["Período", "Ganhos", "Gastos", "Saldo do período", "Saldo acumulado"];

function periodRows(rows: KidsPeriodRow[]) {
  return rows.map((row) => [
    row.label,
    formatCurrency(row.income),
    formatCurrency(row.expense),
    formatCurrency(row.balance),
    formatCurrency(row.running),
  ]);
}

/** Relatório da criança em CSV (separador ponto e vírgula, compatível com Excel). */
export function exportKidsReportCsv(report: KidsReport) {
  const lines = [
    cell(`GastoCerto — Espaço Kids · ${report.who}`),
    cell(`Período de ${formatDate(report.from)} a ${formatDate(report.to)}`),
    cell(`Gerado em ${formatDateTime(new Date().toISOString())}`),
    "",
    [cell("Indicador"), cell("Valor")].join(";"),
    [cell("Total de ganhos"), cell(formatCurrency(report.income))].join(";"),
    [cell("Total de gastos"), cell(formatCurrency(report.expense))].join(";"),
    [cell("Saldo do período"), cell(formatCurrency(report.balance))].join(";"),
    "",
    cell("Evolução por semana"),
    PERIOD_HEADER.map(cell).join(";"),
    ...periodRows(report.weeks).map((row) => row.map(cell).join(";")),
    "",
    cell("Evolução por mês"),
    PERIOD_HEADER.map(cell).join(";"),
    ...periodRows(report.months).map((row) => row.map(cell).join(";")),
    "",
    cell("Lançamentos"),
    [cell("Data"), cell("Tipo"), cell("Descrição"), cell("Valor")].join(";"),
    ...report.entries.map((entry) =>
      [
        cell(formatDate(entry.date)),
        cell(entry.type),
        cell(entry.description),
        cell(formatCurrency(entry.amount)),
      ].join(";"),
    ),
  ];
  download(
    new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    `espaco-kids-${slug(report.who)}.csv`,
  );
}

/** Relatório da criança em PDF com resumo, evolução semanal/mensal e lançamentos. */
export async function exportKidsReportPdf(report: KidsReport) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(15);
  doc.text(`GastoCerto — Espaço Kids · ${report.who}`, 40, 40);
  doc.setFontSize(9);
  doc.text(
    `Período de ${formatDate(report.from)} a ${formatDate(report.to)} · gerado em ${formatDateTime(new Date().toISOString())}`,
    40,
    56,
  );

  autoTable(doc, {
    startY: 72,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de ganhos", formatCurrency(report.income)],
      ["Total de gastos", formatCurrency(report.expense)],
      ["Saldo do período", formatCurrency(report.balance)],
      ["Semanas com movimento", String(report.weeks.length)],
      ["Meses com movimento", String(report.months.length)],
      ["Lançamentos", String(report.entries.length)],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [16, 45, 70] },
  });

  const lastY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  let cursor = lastY() + 24;

  if (report.months.length > 1) {
    doc.setFontSize(11);
    doc.text("Evolução do saldo acumulado", 40, cursor);
    cursor += 10;
    const chartWidth = pageWidth - 80;
    const chartHeight = 110;
    const values = report.months.map((row) => row.running);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    doc.setDrawColor(200);
    doc.line(40, cursor + chartHeight, 40 + chartWidth, cursor + chartHeight);
    doc.setDrawColor(16, 110, 90);
    doc.setLineWidth(1.5);
    report.months.forEach((row, index) => {
      if (index === 0) return;
      const step = chartWidth / (report.months.length - 1);
      const y1 = cursor + chartHeight - ((values[index - 1] - min) / span) * (chartHeight - 12);
      const y2 = cursor + chartHeight - ((values[index] - min) / span) * (chartHeight - 12);
      doc.line(40 + (index - 1) * step, y1, 40 + index * step, y2);
      void row;
    });
    doc.setLineWidth(0.5);
    doc.setFontSize(7);
    doc.text(`máx. ${formatCurrency(max)}`, 40, cursor - 2);
    cursor += chartHeight + 28;
  }

  autoTable(doc, {
    startY: cursor,
    head: [PERIOD_HEADER],
    body: periodRows(report.weeks),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 110, 90] },
    didDrawPage: () => undefined,
  });

  autoTable(doc, {
    startY: lastY() + 20,
    head: [PERIOD_HEADER],
    body: periodRows(report.months),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 45, 70] },
  });

  autoTable(doc, {
    startY: lastY() + 20,
    head: [["Data", "Tipo", "Descrição", "Valor"]],
    body: report.entries.map((entry) => [
      formatDate(entry.date),
      entry.type,
      entry.description,
      formatCurrency(entry.amount),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [90, 90, 90] },
  });

  doc.save(`espaco-kids-${slug(report.who)}.pdf`);
}
