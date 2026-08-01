import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlanAccess } from "@/hooks/use-plan";

/**
 * Aviso fixo de conta somente leitura: aparece quando o teste/licença venceu e
 * não há plano pago. A consulta continua liberada; a escrita fica bloqueada.
 */
export function ReadOnlyBanner() {
  const { data: access } = usePlanAccess();
  if (!access?.readOnly) return null;

  return (
    <div
      role="status"
      className="mb-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2"
    >
      <Lock className="size-4 shrink-0 text-amber-600" aria-hidden />
      <p className="min-w-0 flex-1 text-[12px] leading-snug text-foreground">
        <strong>Modo somente leitura.</strong> {access.readOnlyReason}
      </p>
      <Button size="sm" asChild>
        <Link to="/perfil">Ativar plano</Link>
      </Button>

    </div>
  );
}
