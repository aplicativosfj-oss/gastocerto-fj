import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Chave guardada até o login para ser ativada automaticamente na conta. */
export const PENDING_LICENSE_KEY = "gastocerto:pending-license";

/**
 * Acesso por código de teste: o visitante informa a chave recebida do
 * administrador e é levado ao cadastro/login. Após entrar, a chave é ativada
 * automaticamente (teste com recursos limitados e sem Consultor de IA).
 */
export function CodeAccessDialog({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  const submit = () => {
    const key = code.trim().toUpperCase();
    if (key.length < 6) {
      toast.error("Informe o código completo recebido por e-mail ou WhatsApp.");
      return;
    }
    try {
      sessionStorage.setItem(PENDING_LICENSE_KEY, key);
    } catch {
      /* armazenamento indisponível: o usuário poderá ativar em Meu perfil */
    }
    setOpen(false);
    void navigate({ to: "/auth", search: { mode: "signup" } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden />
            Entrar com código de teste
          </DialogTitle>
          <DialogDescription>
            Use o código liberado pela nossa equipe. Ele dá acesso ao período de teste com recursos
            limitados — o Consultor de IA fica disponível apenas nos planos pagos.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="access-code">Código de acesso</Label>
          <Input
            id="access-code"
            value={code}
            autoComplete="off"
            spellCheck={false}
            placeholder="GC-XXXX-XXXX-XXXX"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            className="mt-1.5 font-mono"
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
