import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Aviso discreto quando o usuário fica sem conexão (o app segue navegável via cache). */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 border-t border-amber-500/30 bg-amber-500/95 px-3 py-2 text-xs font-medium text-amber-950 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      Você está offline — mostrando os dados salvos no dispositivo.
    </div>
  );
}
