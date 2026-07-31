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
    writeOrder({});
    setLabels({});
    setOrder({});
  }, []);

  const labelFor = useCallback(
    (key: string, fallback: string) => labels[key]?.trim() || fallback,
    [labels],
  );

  return { labels, order, save, saveOrder, reset, labelFor };
}

/* -------------------------------------------------------------------------- */
/* Ordenação                                                                   */
/* -------------------------------------------------------------------------- */

const ORDER_KEY = "gc:nav-order";

/** Ordem personalizada: "root" para os grupos e a chave do grupo para os filhos. */
export type NavOrderMap = Record<string, string[]>;

function readOrder(): NavOrderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [
          key,
          (value as unknown[]).filter((item): item is string => typeof item === "string"),
        ]),
    );
  } catch {
    return {};
  }
}

function writeOrder(map: NavOrderMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORDER_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVENT));
}

/** Reordena uma lista de itens conforme a ordem salva, mantendo os novos no fim. */
export function sortBySavedOrder<T extends { key: string }>(
  items: T[],
  savedOrder: string[] | undefined,
): T[] {
  if (!savedOrder || savedOrder.length === 0) return items;
  const position = new Map(savedOrder.map((key, index) => [key, index]));
  return [...items].sort(
    (a, b) =>
      (position.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.key) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Move um item da lista uma posição para cima ou para baixo. */
export function moveInList<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}

