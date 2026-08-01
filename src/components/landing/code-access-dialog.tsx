import { useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldAlert } from "lucide-react";
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
import { useServerFn } from "@tanstack/react-start";
import { adminAccessByCode } from "@/lib/admin-code.functions";

/** Chave guardada até o login para ser ativada automaticamente na conta. */
export const PENDING_LICENSE_KEY = "gastocerto:pending-license";

/**
 * Acesso por código: o visitante informa a chave recebida.
 * Se for o código mestre do admin, abre o painel.
 * Se for licença de teste, leva ao cadastro.
 */
export function CodeAccessDialog({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(adminAccessByCode);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const key = code.trim().toUpperCase();
    if (key.length < 5) {
      toast.error("Informe o código completo.");
      return;
    }

    setLoading(true);
    try {
      // Tenta validar como admin primeiro
      const res = await checkAdmin({ data: { code: key } });
      if (res.success) {
        toast.success("Acesso administrativo confirmado.");
        setOpen(false);
        // Usamos location.href para forçar uma recarga limpa e garantir o estado do Admin
        window.location.href = "/admin";
        return;
      }
    } catch (e) {
      // Não é admin, segue fluxo de licença normal
    } finally {
      setLoading(false);
    }

    // Fluxo normal de licença pendente
    try {
      sessionStorage.setItem(PENDING_LICENSE_KEY, key);
    } catch {
      /* storage indisponível */
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
            Acesso por código
          </DialogTitle>
          <DialogDescription>
            Insira seu código de acesso ou licença. Se você recebeu um código administrativo, insira-o aqui para acessar o painel.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="access-code">Código</Label>
          <Input
            id="access-code"
            value={code}
            autoComplete="off"
            spellCheck={false}
            placeholder="GC-XXXX-XXXX"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            className="mt-1.5 font-mono"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={submit} disabled={loading} className="w-full sm:w-auto">
            {loading ? "Verificando..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

