import { useCallback, useEffect, useState } from "react";

/** Preferências de exportação de PDF do lançamento (salvas no navegador). */
export type PdfPreferences = {
  /** Padrão do nome do arquivo com marcadores {categoria} {data} {estabelecimento} {descricao} {valor}. */
  filenamePattern: string;
  pageSize: "a4" | "letter";
  orientation: "portrait" | "landscape";
  watermark: boolean;
  watermarkText: string;
};

export const PDF_PLACEHOLDERS = [
  "{categoria}",
  "{data}",
  "{estabelecimento}",
  "{descricao}",
  "{valor}",
] as const;

export const DEFAULT_PDF_PREFERENCES: PdfPreferences = {
  filenamePattern: "{categoria}-{data}-{estabelecimento}",
  pageSize: "a4",
  orientation: "portrait",
  watermark: false,
  watermarkText: "Controle Gastos",
};

const STORAGE_KEY = "gastocerto:pdf-preferences";
const EVENT = "gastocerto:pdf-preferences-changed";

export function readPdfPreferences(): PdfPreferences {
  if (typeof window === "undefined") return DEFAULT_PDF_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PDF_PREFERENCES;
    return { ...DEFAULT_PDF_PREFERENCES, ...(JSON.parse(raw) as Partial<PdfPreferences>) };
  } catch {
    return DEFAULT_PDF_PREFERENCES;
  }
}

export function writePdfPreferences(preferences: PdfPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(EVENT));
}

/** Lê e grava as preferências reagindo a mudanças feitas em outros pontos do app. */
export function usePdfPreferences() {
  const [preferences, setPreferences] = useState<PdfPreferences>(DEFAULT_PDF_PREFERENCES);

  useEffect(() => {
    setPreferences(readPdfPreferences());
    const sync = () => setPreferences(readPdfPreferences());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((next: PdfPreferences) => {
    writePdfPreferences(next);
    setPreferences(next);
  }, []);

  return { preferences, update };
}

function slug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase() || "sem-dado"
  );
}

/** Monta o nome do arquivo a partir do padrão do usuário. */
export function buildPdfFilename(
  pattern: string,
  data: { categoria: string; data: string; estabelecimento: string; descricao: string; valor: string },
) {
  const base = (pattern.trim() || DEFAULT_PDF_PREFERENCES.filenamePattern)
    .replace(/\{categoria\}/gi, slug(data.categoria))
    .replace(/\{data\}/gi, slug(data.data))
    .replace(/\{estabelecimento\}/gi, slug(data.estabelecimento))
    .replace(/\{descricao\}/gi, slug(data.descricao))
    .replace(/\{valor\}/gi, slug(data.valor))
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "lancamento"}.pdf`;
}
