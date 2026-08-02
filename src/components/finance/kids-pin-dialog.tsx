import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Baby, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Diálogo de acesso por PIN para o Modo Criança.
 * Garante que a criança só acesse seu próprio ambiente.
 */
export function KidsPinDialog({
  open,
  onOpenChange,
  pin,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin?: string | null;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(false);
    }
  }, [open]);

  const handleKeyPress = (digit: string) => {
    if (code.length < 4) {
      const newCode = code + digit;
      setCode(newCode);
      setError(false);
      
      if (newCode.length === 4) {
        if (pin && newCode === pin) {
          toast.success("Acesso liberado! Divirta-se!");
          onSuccess();
          onOpenChange(false);
        } else {
          setError(true);
          toast.error("PIN incorreto. Tente novamente.");
          setTimeout(() => setCode(""), 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
    setError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] rounded-3xl border-0 bg-background/95 backdrop-blur-md p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <Baby className="size-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Espaço Kids</DialogTitle>
          <DialogDescription className="text-xs">
            Digite seu PIN de 4 dígitos para entrar
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "size-4 rounded-full border-2 transition-all duration-200",
                code.length > i 
                  ? "bg-primary border-primary scale-110" 
                  : "border-muted-foreground/30",
                error && "bg-destructive border-destructive animate-shake"
              )}
            />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Button
              key={n}
              variant="outline"
              className="h-14 rounded-2xl text-xl font-bold hover:bg-primary/5 hover:border-primary/50"
              onClick={() => handleKeyPress(n.toString())}
            >
              {n}
            </Button>
          ))}
          <div />
          <Button
            variant="outline"
            className="h-14 rounded-2xl text-xl font-bold"
            onClick={() => handleKeyPress("0")}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-14 rounded-2xl"
            onClick={handleBackspace}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          <span>Ambiente seguro para crianças</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
