import { useState } from "react";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PasswordConfirmDialog } from "@/components/finance/password-confirm-dialog";
import { MONTH_NAMES } from "@/lib/finance";
import { usePastEditUnlock, PAST_EDIT_UNLOCK_MINUTES } from "@/lib/past-edit-unlock";
import { useClosingPolicy } from "@/lib/use-closing-policy";

type PastMonthsLockNoticeProps = {
  /** Competência exibida na tela, no formato YYYY-MM. */
  monthKey: string;
  className?: string;
};

function labelOf(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

/**
 * Aviso de que competências passadas estão bloqueadas até a confirmação da
 * senha, com liberação única válida por alguns minutos para o mês inteiro.
 */
export function PastMonthsLockNotice({ monthKey, className }: PastMonthsLockNoticeProps) {
  const { policy } = useClosingPolicy();
  const { unlocked, minutesLeft, grant, revoke } = usePastEditUnlock(monthKey);
  const [askPassword, setAskPassword] = useState(false);

  const currentKey = new Date().toISOString().slice(0, 7);
  const isPast = monthKey < currentKey;

  if (!isPast) return null;
  if (!policy.lockPastMonths && !policy.requirePasswordForPastEdits) return null;

  const adminBlocked = policy.lockPastMonths;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        unlocked && !adminBlocked
          ? "border-primary/40 bg-primary/5"
          : "border-amber-500/40 bg-amber-500/5"
      } ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {unlocked && !adminBlocked ? (
            <LockOpen className="mt-0.5 size-5 text-primary" />
          ) : (
            <Lock className="mt-0.5 size-5 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {adminBlocked
                ? `${labelOf(monthKey)} está bloqueado pelo administrador`
                : unlocked
                  ? `${labelOf(monthKey)} liberado para edição por ${minutesLeft} min`
                  : `${labelOf(monthKey)} é um mês anterior e está bloqueado`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adminBlocked
                ? policy.notice ||
                  "Solicite a liberação em Fechamento mensal para retificar lançamentos deste mês."
                : unlocked
                  ? "Você pode editar vários lançamentos deste mês sem repetir a senha até a liberação expirar."
                  : `Confirme sua senha uma vez para editar os lançamentos deste mês; a liberação vale ${PAST_EDIT_UNLOCK_MINUTES} minutos.`}
            </p>
          </div>
        </div>

        {adminBlocked ? null : unlocked ? (
          <Button type="button" variant="outline" size="sm" onClick={revoke}>
            <Lock className="size-4" />
            Bloquear agora
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => setAskPassword(true)}>
            <ShieldCheck className="size-4" />
            Confirmar senha
          </Button>
        )}
      </div>

      <PasswordConfirmDialog
        open={askPassword}
        onOpenChange={setAskPassword}
        description={`Confirme sua senha para liberar a edição de ${labelOf(monthKey)} por ${PAST_EDIT_UNLOCK_MINUTES} minutos.`}
        onConfirmed={grant}
      />
    </div>
  );
}
