import { formatCurrency, formatDate } from "@/lib/format";
import type { MonthBalance } from "@/lib/closing";
import { MONTH_NAMES, toCents } from "@/lib/finance";
import type { Transaction } from "@/lib/transactions";

export type CategoryTotal = {
  name: string;
  total: number;
  count: number;
  share: number;
};

export type AnnualBalance = {
  year: number;
  months: MonthBalance[];
  income: number;
  expense: number;
  result: number;
  opening: number;
  closing: number;
  count: number;
  bestMonth: MonthBalance | null;
  worstMonth: MonthBalance | null;
  monthlyAverageExpense: number;
  monthlyAverageIncome: number;
  savingsRate: number;
  categories: CategoryTotal[];
};

/**
 * Consolida o balanço geral do ano a partir do balancete mensal já encadeado.
 * `categoryName` resolve o nome legível de cada categoria dos lançamentos.
 */
export function buildAnnualBalance(
  year: number,
  balance: MonthBalance[],
  transactions: Transaction[],
  categoryName: (id: string | null) => string,
): AnnualBalance {
  const months = balance.filter((row) => row.year === year);
  const income = toCents(months.reduce((sum, row) => sum + row.income, 0));
  const expense = toCents(months.reduce((sum, row) => sum + row.expense, 0));
  const withMovement = months.filter((row) => row.count > 0);

  const yearRows = transactions.filter(
    (row) => row.transaction_date.slice(0, 4) === String(year) && row.status !== "canceled",
  );
  const map = new Map<string, { total: number; count: number }>();
  for (const row of yearRows) {
    if (row.transaction_type !== "expense") continue;
    const key = categoryName(row.category_id);
    const current = map.get(key) ?? { total: 0, count: 0 };
    current.total += Number(row.amount);
    current.count += 1;
    map.set(key, current);
  }
  const categories: CategoryTotal[] = [...map.entries()]
    .map(([name, value]) => ({
      name,
      total: toCents(value.total),
      count: value.count,
      share: expense > 0 ? (value.total / expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const sortedByResult = [...withMovement].sort((a, b) => b.result - a.result);

  return {
    year,
    months,
    income,
    expense,
    result: toCents(income - expense),
    opening: months[0]?.opening ?? 0,
    closing: months.at(-1)?.closing ?? 0,
    count: months.reduce((sum, row) => sum + row.count, 0),
    bestMonth: sortedByResult[0] ?? null,
    worstMonth: sortedByResult.at(-1) ?? null,
    monthlyAverageExpense: withMovement.length ? toCents(expense / withMovement.length) : 0,
    monthlyAverageIncome: withMovement.length ? toCents(income / withMovement.length) : 0,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    categories,
  };
}

/** Balanço geral do ano em PDF (resumo, meses e categorias). */
export async function exportAnnualBalancePdf(balance: AnnualBalance, ownerName?: string) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(`GastoCerto — Balanço geral ${balance.year}`, 40, 42);
  doc.setFontSize(9);
  doc.text(
    `${ownerName ? `${ownerName} · ` : ""}Gerado em ${formatDate(new Date().toISOString().slice(0, 10))}`,
    40,
    58,
  );

  autoTable(doc, {
    startY: 74,
    head: [["Indicador", "Valor"]],
    body: [
      ["Saldo inicial do ano", formatCurrency(balance.opening)],
      ["Total de entradas", formatCurrency(balance.income)],
      ["Total de saídas", formatCurrency(balance.expense)],
      ["Resultado do ano", formatCurrency(balance.result)],
      ["Saldo final", formatCurrency(balance.closing)],
      ["Média mensal de saídas", formatCurrency(balance.monthlyAverageExpense)],
      ["Média mensal de entradas", formatCurrency(balance.monthlyAverageIncome)],
      ["Taxa de poupança", `${balance.savingsRate.toFixed(1).replace(".", ",")}%`],
      ["Lançamentos no ano", String(balance.count)],
      [
        "Melhor mês",
        balance.bestMonth
          ? `${balance.bestMonth.label} (${formatCurrency(balance.bestMonth.result)})`
          : "—",
      ],
      [
        "Mês mais apertado",
        balance.worstMonth
          ? `${balance.worstMonth.label} (${formatCurrency(balance.worstMonth.result)})`
          : "—",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [15, 42, 69], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
  });

  let cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;

  autoTable(doc, {
    startY: cursor,
    head: [["Mês", "Entradas", "Saídas", "Resultado", "Saldo final", "Lanç."]],
    body: balance.months.map((row) => [
      MONTH_NAMES[row.month - 1] ?? row.label,
      formatCurrency(row.income),
      formatCurrency(row.expense),
      formatCurrency(row.result),
      formatCurrency(row.closing),
      String(row.count),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 42, 69], textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  cursor = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  if (cursor > 680) {
    doc.addPage();
    cursor = 60;
  }

  autoTable(doc, {
    startY: cursor,
    head: [["Categoria", "Total", "% do ano", "Lanç."]],
    body: balance.categories
      .slice(0, 30)
      .map((row) => [
        row.name,
        formatCurrency(row.total),
        `${row.share.toFixed(1).replace(".", ",")}%`,
        String(row.count),
      ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 110, 90], textColor: 255 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  doc.save(`balanco-anual-${balance.year}-gastocerto.pdf`);
}

/** Balanço anual em CSV para planilhas. */
export function exportAnnualBalanceCsv(balance: AnnualBalance) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const money = (value: number) => value.toFixed(2).replace(".", ",");

  const lines = [
    cell(`GastoCerto — Balanço geral ${balance.year}`),
    "",
    ["Mês", "Entradas", "Saídas", "Resultado", "Saldo final", "Lançamentos"]
      .map(cell)
      .join(";"),
    ...balance.months.map((row) =>
      [
        MONTH_NAMES[row.month - 1] ?? row.label,
        money(row.income),
        money(row.expense),
        money(row.result),
        money(row.closing),
        row.count,
      ]
        .map(cell)
        .join(";"),
    ),
    "",
    ["Categoria", "Total", "% do ano", "Lançamentos"].map(cell).join(";"),
    ...balance.categories.map((row) =>
      [row.name, money(row.total), row.share.toFixed(1).replace(".", ","), row.count]
        .map(cell)
        .join(";"),
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `balanco-anual-${balance.year}-gastocerto.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
