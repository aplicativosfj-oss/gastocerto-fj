/**
 * Importação do histórico de trocas de gás a partir de CSV / planilha colada.
 *
 * Aceita separador `;`, `,` ou TAB, cabeçalho opcional e datas em
 * `dd/mm/aaaa` ou `aaaa-mm-dd`. Valores aceitam `1.234,56` e `1234.56`.
 */

export type GasImportRow = {
  line: number;
  refill_date: string;
  amount: number;
  size_kg: number;
  supplier: string | null;
  payment_method: string | null;
  notes: string | null;
};

export type GasImportResult = {
  rows: GasImportRow[];
  errors: { line: number; message: string }[];
};

const HEADER_HINTS = ["data", "date", "valor", "amount"];

function splitLine(line: string) {
  const separator = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
  return line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

export function parseGasDate(value: string): string | null {
  const text = value.trim();
  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(text);
  if (br) {
    const [, d, m, rawYear] = br;
    const year = rawYear!.length === 2 ? `20${rawYear}` : rawYear!;
    const iso = `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    return Number.isNaN(new Date(`${iso}T12:00:00`).getTime()) ? null : iso;
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return null;
}

export function parseGasAmount(value: string): number | null {
  const text = value.replace(/[^\d,.-]/g, "").trim();
  if (!text) return null;
  const normalized =
    text.includes(",") && text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Converte o texto colado/arquivo CSV em linhas prontas para gravar. */
export function parseGasCsv(input: string): GasImportResult {
  const rows: GasImportRow[] = [];
  const errors: { line: number; message: string }[] = [];

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  lines.forEach((line, index) => {
    const cells = splitLine(line);
    const lower = cells.map((cell) => cell.toLowerCase());
    const isHeader =
      index === 0 && HEADER_HINTS.some((hint) => lower.some((cell) => cell.includes(hint)));
    if (isHeader) return;

    const lineNumber = index + 1;
    const date = parseGasDate(cells[0] ?? "");
    if (!date) {
      errors.push({ line: lineNumber, message: `Data inválida: "${cells[0] ?? ""}"` });
      return;
    }
    const amount = parseGasAmount(cells[1] ?? "");
    if (amount == null || amount <= 0) {
      errors.push({ line: lineNumber, message: `Valor inválido: "${cells[1] ?? ""}"` });
      return;
    }
    const size = parseGasAmount(cells[2] ?? "");

    rows.push({
      line: lineNumber,
      refill_date: date,
      amount: Number(amount.toFixed(2)),
      size_kg: size && size > 0 ? size : 13,
      supplier: cells[3]?.trim() || null,
      payment_method: cells[4]?.trim().toLowerCase() || null,
      notes: cells[5]?.trim() || null,
    });
  });

  const unique = new Map<string, GasImportRow>();
  for (const row of rows) {
    const key = `${row.refill_date}:${row.amount.toFixed(2)}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  return {
    rows: [...unique.values()].sort((a, b) => a.refill_date.localeCompare(b.refill_date)),
    errors,
  };
}

export const GAS_CSV_TEMPLATE = [
  "data;valor;tamanho_kg;revenda;pagamento;observacao",
  "10/01/2026;115,00;13;Ultragaz do bairro;pix;",
  "12/03/2026;120,00;13;Liquigás;dinheiro;",
].join("\n");
