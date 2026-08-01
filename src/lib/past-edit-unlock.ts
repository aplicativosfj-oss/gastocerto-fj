/**
 * Confirmação de senha reaproveitável para editar meses anteriores.
 *
 * Depois que o cliente confirma a senha uma vez, a liberação vale por um
 * tempo curto (30 min) para toda a competência, evitando repetir a senha em
 * cada lançamento. Fica só na sessão do navegador (sessionStorage), então
 * fechar o navegador encerra a liberação.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gc.past-edit-unlock";
/** Duração da liberação, em minutos. */
export const PAST_EDIT_UNLOCK_MINUTES = 30;
const UNLOCK_EVENT = "gc:past-edit-unlock";

type Grants = Record<string, number>;

function readGrants(): Grants {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Grants) : {};
    const now = Date.now();
    const valid: Grants = {};
    Object.entries(parsed).forEach(([key, expires]) => {
      if (typeof expires === "number" && expires > now) valid[key] = expires;
    });
    return valid;
  } catch {
    return {};
  }
}

function writeGrants(grants: Grants) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(grants));
  } catch {
    /* sessão sem armazenamento: liberação vale apenas em memória */
  }
  window.dispatchEvent(new Event(UNLOCK_EVENT));
}

/** Chave de competência (YYYY-MM) usada para guardar a liberação. */
export function monthKeyOf(isoDateValue: string) {
  return isoDateValue.slice(0, 7);
}

/** Libera a competência informada pelo tempo padrão. */
export function grantPastEditUnlock(monthKey: string) {
  const grants = readGrants();
  grants[monthKey] = Date.now() + PAST_EDIT_UNLOCK_MINUTES * 60 * 1000;
  writeGrants(grants);
}

/** Encerra a liberação de uma competência (ou de todas). */
export function revokePastEditUnlock(monthKey?: string) {
  if (!monthKey) {
    writeGrants({});
    return;
  }
  const grants = readGrants();
  delete grants[monthKey];
  writeGrants(grants);
}

/** Verdadeiro quando a competência tem liberação válida agora. */
export function isPastEditUnlocked(monthKey: string) {
  const expires = readGrants()[monthKey];
  return Boolean(expires && expires > Date.now());
}

/** Momento em que a liberação expira (ou null). */
export function pastEditUnlockExpiry(monthKey: string): number | null {
  return readGrants()[monthKey] ?? null;
}

/**
 * Acompanha a liberação de uma competência de forma reativa (revalida a cada
 * 15s e escuta liberações feitas em outra parte da tela).
 */
export function usePastEditUnlock(monthKey: string) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const sync = useCallback(() => {
    setExpiresAt(pastEditUnlockExpiry(monthKey));
  }, [monthKey]);

  useEffect(() => {
    sync();
    const interval = window.setInterval(sync, 15_000);
    window.addEventListener(UNLOCK_EVENT, sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(UNLOCK_EVENT, sync);
    };
  }, [sync]);

  const unlocked = Boolean(expiresAt && expiresAt > Date.now());
  const minutesLeft = unlocked && expiresAt ? Math.max(1, Math.round((expiresAt - Date.now()) / 60000)) : 0;

  return {
    unlocked,
    minutesLeft,
    grant: () => {
      grantPastEditUnlock(monthKey);
      sync();
    },
    revoke: () => {
      revokePastEditUnlock(monthKey);
      sync();
    },
  };
}
