/**
 * Avisos no celular/desktop do responsável usando as notificações do navegador.
 * Funciona com o app aberto (inclusive instalado na tela inicial do celular).
 */
import { useCallback, useEffect, useState } from "react";

import { readLocalPref, writeLocalPref } from "@/lib/local-session";

const PREF_KEY = "gc:push-alerts";

export type PushPermission = "unsupported" | "default" | "granted" | "denied";

function currentPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermission;
}

export function usePushAlerts() {
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setPermission(currentPermission());
    setEnabled(readLocalPref(PREF_KEY) === "1");
  }, []);

  const setPreference = useCallback((value: boolean) => {
    setEnabled(value);
    writeLocalPref(PREF_KEY, value ? "1" : "0");
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
    const result = (await Notification.requestPermission()) as PushPermission;
    setPermission(result);
    if (result === "granted") setPreference(true);
    return result;
  }, [setPreference]);

  return {
    permission,
    enabled: enabled && permission === "granted",
    supported: permission !== "unsupported",
    request,
    setPreference,
  };
}

/** Dispara um aviso no dispositivo, se o responsável já autorizou. */
export function showDeviceAlert(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (readLocalPref(PREF_KEY) === "0") return;
  try {
    const notification = new Notification(title, {
      body,
      tag: tag ?? title,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Alguns navegadores só permitem via service worker; o aviso no app continua valendo.
  }
}
