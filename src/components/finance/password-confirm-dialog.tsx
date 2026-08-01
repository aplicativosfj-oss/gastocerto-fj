import { useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyMyPassword } from "@/lib/reauth.functions";

export type PasswordConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mantido por compatibilidade; a validação usa o e-mail real da sessão. */
  email?: string | null;
  description?: string;
  /** Competências bloqueadas (YYYY-MM) que a confirmação vai liberar. */
  lockedMonths?: string[];
  /** Ação exata que será executada depois da confirmação. */
  actionLabel?: string | null;
  onConfirmed: () => void;
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return `${MONTHS[month - 1]} de ${year}`;
}

/**
 * Reautenticação leve: confirma a senha do próprio usuário antes de liberar
 * uma ação sensível (ex.: retificar lançamento de mês anterior). A checagem
 * roda no servidor, então a sessão atual não é substituída.
 */
export function PasswordConfirmDialog({
  open,
  onOpenChange,
  description,
  lockedMonths,
  actionLabel,
  onConfirmed,
}: PasswordConfirmDialogProps) {
  const verify = useServerFn(verifyMyPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim()) {
      setError("Informe sua senha de acesso.");
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const result = await verify({ data: { password } });
      if (!result.ok) {
        setError(result.reason ?? "Senha incorreta. Tente novamente.");
        return;
      }
      setPassword("");
      onOpenChange(false);
      onConfirmed();
    } catch {
      setError("Não foi possível validar a senha agora. Tente novamente.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Confirme sua senha
          </DialogTitle>
          <DialogDescription>
            {description ??
              "Meses anteriores ficam bloqueados. Confirme sua senha de acesso para liberar a edição por 30 minutos."}
          </DialogDescription>
        </DialogHeader>

        {lockedMonths?.length || actionLabel ? (
          <div className="space-y-2.5 rounded-xl border border-amber-500/35 bg-amber-500/5 p-3">
            {lockedMonths?.length ? (
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
                    {lockedMonths.length > 1 ? "Meses bloqueados" : "Mês bloqueado"}
                  </p>
                  <p className="text-[13px] font-semibold text-foreground">
                    {lockedMonths.map(monthLabel).join(", ")}
                  </p>
                </div>
              </div>
            ) : null}
            {actionLabel ? (
              <div className="flex items-start gap-2 border-t border-amber-500/25 pt-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Será liberado agora
                  </p>
                  <p className="truncate text-[13px] font-semibold text-foreground">{actionLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    A liberação vale para todos os lançamentos deste mês por 30 minutos.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={handleConfirm}>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Senha da sua conta</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={checking}>
              {checking ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
