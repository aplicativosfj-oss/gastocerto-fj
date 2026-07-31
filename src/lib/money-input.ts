/**
 * Máscara automática de valores em Real: o usuário só digita números e o
 * sistema posiciona os pontos de milhar e a vírgula dos centavos.
 */

/** Converte a digitação em "1.234,56" (últimos 2 dígitos = centavos). */
export function maskAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  const padded = digits.padStart(3, "0");
  const cents = padded.slice(-2);
  const units = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const grouped = units.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${cents}`;
}

/** Formata um número já salvo para o campo mascarado. */
export function amountToInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return "";
  return maskAmountInput(Math.round(Math.abs(numeric) * 100).toString());
}

/** Máscara de números decimais livres (odômetro, litros, juros, quantidade). */
export function maskDecimalInput(raw: string, decimals = 2): string {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const [head, ...rest] = cleaned.split(",");
  if (rest.length === 0) return head;
  return `${head},${rest.join("").slice(0, decimals)}`;
}
