/**
 * Presets de filtro e persistência local das preferências.
 * Guarda por página (chave) no navegador do usuário, sem enviar nada ao servidor.
 */

export type FilterState = {
  search: string;
  merchant: string;
  from: string;
  to: string;
  category: string;
  status: string;
  type: string;
  vehicle: string;
  sort: string;
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
  merchant: "",
  from: "",
  to: "",
  category: "all",
  status: "all",
  type: "all",
  vehicle: "all",
  sort: "date_desc",
};

/** Converte uma data para o formato aceito pelos inputs (YYYY-MM-DD). */
function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return iso(date);
}

export type FilterPreset = {
  key: string;
  label: string;
  /** Presets podem sobrepor apenas parte dos filtros. */
  values: () => Partial<FilterState>;
};

/** Presets prontos, cobrindo os recortes que o usuário pede no dia a dia. */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    key: "month",
    label: "Mês atual",
    values: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: iso(first), to: iso(last), type: "all", status: "all" };
    },
  },
  {
    key: "prevMonth",
    label: "Mês anterior",
    values: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last), type: "all", status: "all" };
    },
  },
  {
    key: "last30",
    label: "Últimos 30 dias",
    values: () => ({ from: shiftDays(-30), to: iso(new Date()), type: "all" }),
  },
  {
    key: "last7",
    label: "Últimos 7 dias",
    values: () => ({ from: shiftDays(-7), to: iso(new Date()), type: "all" }),
  },
  {
    key: "expenses",
    label: "Só despesas",
    values: () => ({ type: "expense" }),
  },
  {
    key: "pending",
    label: "Em aberto",
    values: () => ({ status: "pending" }),
  },
  {
    key: "biggest",
    label: "Maiores valores",
    values: () => ({ sort: "amount_desc" }),
  },
];

/** Preferência salva pelo usuário (um "meu filtro"). */
export type SavedFilter = {
  id: string;
  name: string;
  values: FilterState;
  createdAt: string;
};

const PREFIX = "gc.filters.";

function storageKey(scope: string) {
  return `${PREFIX}${scope}`;
}

/** Lê as preferências salvas de uma tela. */
export function loadSavedFilters(scope: string): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFilter[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function persist(scope: string, list: SavedFilter[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(list.slice(0, 12)));
  } catch {
    /* Armazenamento indisponível (aba privada): segue sem salvar. */
  }
}

/** Salva (ou substitui pelo nome) um conjunto de filtros. */
export function saveFilter(scope: string, name: string, values: FilterState): SavedFilter[] {
  const clean = name.trim().slice(0, 40) || "Meu filtro";
  const list = loadSavedFilters(scope).filter(
    (item) => item.name.toLowerCase() !== clean.toLowerCase(),
  );
  const next: SavedFilter[] = [
    {
      id: `${Date.now()}`,
      name: clean,
      values,
      createdAt: new Date().toISOString(),
    },
    ...list,
  ];
  persist(scope, next);
  return next;
}

/** Remove uma preferência salva. */
export function removeSavedFilter(scope: string, id: string): SavedFilter[] {
  const next = loadSavedFilters(scope).filter((item) => item.id !== id);
  persist(scope, next);
  return next;
}

/** Conta quantos campos estão diferentes do padrão. */
export function countActiveFilters(values: FilterState): number {
  return (Object.keys(EMPTY_FILTERS) as (keyof FilterState)[]).filter(
    (key) => values[key] !== EMPTY_FILTERS[key],
  ).length;
}
