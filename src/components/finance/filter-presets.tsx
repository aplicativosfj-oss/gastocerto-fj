import { useEffect, useState } from "react";
import { BookmarkPlus, Filter, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FILTER_PRESETS,
  countActiveFilters,
  loadSavedFilters,
  removeSavedFilter,
  saveFilter,
  type FilterState,
  type SavedFilter,
} from "@/lib/filter-presets";

/**
 * Barra de presets de filtro com "meus filtros" salvos no aparelho.
 * Pensada para o mobile: chips grandes, uma rolagem horizontal e nada de formulário longo.
 */
export function FilterPresets({
  scope,
  values,
  onApply,
  onClear,
}: {
  scope: string;
  values: FilterState;
  onApply: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setSaved(loadSavedFilters(scope));
  }, [scope]);

  const active = countActiveFilters(values);

  return (
    <div className="grid gap-2 rounded-xl border border-border bg-card/60 p-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span className="truncate">Filtros rápidos</span>
          {active > 0 ? (
            <span className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">
              {active}
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => {
              setNaming((prev) => !prev);
              setName("");
            }}
          >
            <BookmarkPlus className="size-3.5" aria-hidden="true" />
            Salvar
          </Button>
          {active > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={onClear}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      {naming ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(saveFilter(scope, name, values));
            setNaming(false);
            setName("");
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do filtro (ex.: Combustível do mês)"
            className="h-8 text-[12px]"
          />
          <Button type="submit" size="sm" className="h-8 px-3 text-[11px]">
            Salvar
          </Button>
        </form>
      ) : null}

      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onApply(preset.values())}
            className="shrink-0 rounded-full border border-border bg-secondary/70 px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand/10"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {saved.length > 0 ? (
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {saved.map((item) => (
            <span
              key={item.id}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border border-brand/30 bg-brand/10 pl-2.5 pr-1 text-[11px] font-semibold text-foreground",
              )}
            >
              <button
                type="button"
                className="flex items-center gap-1 py-1"
                onClick={() => onApply(item.values)}
              >
                <Star className="size-3 text-brand" aria-hidden="true" />
                {item.name}
              </button>
              <button
                type="button"
                aria-label={`Remover filtro ${item.name}`}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setSaved(removeSavedFilter(scope, item.id))}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
