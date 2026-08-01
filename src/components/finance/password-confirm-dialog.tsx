import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
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
  onConfirmed: () => void;
};

/**
 * Reautenticação leve: confirma a senha do próprio usuário antes de liberar
 * uma ação sensível (ex.: retificar lançamento de mês anterior). A checagem
 * roda no servidor, então a sessão atual não é substituída.
 */
export function PasswordConfirmDialog({
  open,
  onOpenChange,
  description,
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
              "Para alterar informações de um mês anterior é necessário confirmar sua identidade."}
          </DialogDescription>
        </DialogHeader>

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
