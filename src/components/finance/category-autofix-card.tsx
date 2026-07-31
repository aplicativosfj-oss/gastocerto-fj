import { Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApplyCategoryAutofix, useCategoryAutofix } from "@/lib/category-autofix";
import { formatCurrency, formatDate } from "@/lib/format";

/**
 * Detecta gastos de aplicativos/licenças, IPVA, licenciamento, farmácia e afins
 * que ficaram sem categoria (ou em categoria genérica) e corrige em um clique.
 */
export function CategoryAutofixCard() {
  const suggestions = useCategoryAutofix();
  const apply = useApplyCategoryAutofix();

  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="size-4 text-[oklch(0.72_0.16_160)]" />
          Revisão automática de categorias
        </h2>
        <Badge variant="secondary">{suggestions.length} lançamento(s)</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Encontramos gastos que combinam com categorias específicas (aplicativos e licenças, IPVA,
        licenciamento, medicamentos). Ajustar garante que eles apareçam nos relatórios certos.
      </p>

      <ul className="mt-3 space-y-2">
        {suggestions.slice(0, 8).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-2 text-xs"
          >
            <span>
              <span className="font-medium">{item.description}</span>{" "}
              <span className="text-muted-foreground">
                · {formatDate(item.date)} · {formatCurrency(item.amount)}
              </span>
            </span>
            <span className="text-muted-foreground">
              {item.currentCategory} → <span className="font-medium text-foreground">{item.targetCategory}</span>
            </span>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        size="sm"
        className="mt-3 h-8"
        disabled={apply.isPending}
        onClick={async () => {
          const result = await apply.mutateAsync(suggestions);
          if (result.applied > 0) toast.success(`${result.applied} lançamento(s) corrigido(s).`);
          if (result.blocked.length > 0)
            toast.error(
              `${result.blocked.length} lançamento(s) estão em meses fechados e precisam de liberação.`,
            );
        }}
      >
        {apply.isPending ? "Corrigindo…" : "Corrigir automaticamente"}
      </Button>
    </section>
  );
}
