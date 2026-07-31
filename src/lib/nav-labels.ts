import { useCallback, useEffect, useState } from "react";

/**
 * Rótulos personalizados do menu lateral.
 * Ficam salvos no navegador do usuário, sem precisar editar código.
 */
const STORAGE_KEY = "gc:nav-labels";
const EVENT = "gc:nav-labels-changed";

export type NavLabelMap = Record<string, string>;

function read(): NavLabelMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string" && (value as string).trim().length > 0)
        .map(([key, value]) => [key, (value as string).trim().slice(0, 32)]),
    );
  } catch {
    return {};
  }
}

function write(map: NavLabelMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVENT));
}

/** Lê e grava os rótulos personalizados, reagindo a mudanças em outras telas. */
export function useNavLabels() {
  const [labels, setLabels] = useState<NavLabelMap>({});

  useEffect(() => {
    setLabels(read());
    const sync = () => setLabels(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: NavLabelMap) => {
    write(next);
    setLabels(read());
  }, []);

  const reset = useCallback(() => {
    write({});
    setLabels({});
  }, []);

  const labelFor = useCallback(
    (key: string, fallback: string) => labels[key]?.trim() || fallback,
    [labels],
  );

  return { labels, save, reset, labelFor };
}
