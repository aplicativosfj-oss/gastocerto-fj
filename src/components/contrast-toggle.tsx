import { Contrast } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ContrastToggle({ className }: { className?: string }) {
  const { highContrast, toggleContrast } = useTheme();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        onClick={toggleContrast}
        aria-pressed={highContrast}
        aria-label={
          highContrast
            ? "Alto contraste ativado. Desativar modo de alto contraste"
            : "Alto contraste desativado. Ativar modo de alto contraste"
        }
        title="Modo de alto contraste"
      >
        <Contrast className="size-4" aria-hidden="true" />
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {highContrast ? "Modo de alto contraste ativado" : "Modo de alto contraste desativado"}
      </span>
    </>
  );
}
