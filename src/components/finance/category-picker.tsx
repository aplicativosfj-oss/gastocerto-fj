import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  GlyphCheck,
  GlyphClock,
  GlyphSearch,
  GlyphSelector,
  GlyphStar,
} from "@/components/ui/glyphs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export type PickerCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

const RECENT_KEY = "gc:recent-categories";
const FAVORITE_KEY = "gc:favorite-categories";
const MAX_RECENT = 6;
const MAX_FAVORITES = 8;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function readRecentCategories() {
  return readList(RECENT_KEY);
}

export function rememberCategory(id: string) {
  if (!id) return;
  writeList(RECENT_KEY, [id, ...readList(RECENT_KEY).filter((item) => item !== id)].slice(0, MAX_RECENT));
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  placeholder = "Buscar categoria (digite para filtrar)",
  autoFilled = false,
}: {
  categories: (PickerCategory & { parent_id?: string | null })[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Mostra aviso de que o valor veio do último lançamento. */
  autoFilled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [chipIndex, setChipIndex] = useState(0);
  const chipsRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    setRecent(readList(RECENT_KEY));
    setFavorites(readList(FAVORITE_KEY));
  }, []);

  useEffect(() => {
    sync();
  }, [sync, open]);

  const byId = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  
  const rootCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const subCategories = useMemo(() => {
    const map = new Map<string, (PickerCategory & { parent_id?: string | null })[]>();
    categories.forEach(c => {
      if (c.parent_id) {
        const list = map.get(c.parent_id) || [];
        list.push(c);
        map.set(c.parent_id, list);
      }
    });
    return map;
  }, [categories]);

  const selected = value ? (byId.get(value) ?? null) : null;

  const favoriteList = useMemo(
    () => favorites.map((id) => byId.get(id)).filter((item): item is PickerCategory => Boolean(item)),
    [favorites, byId],
  );

  const recentList = useMemo(
    () =>
      recent
        .filter((id) => !favorites.includes(id))
        .map((id) => byId.get(id))
        .filter((item): item is PickerCategory => Boolean(item)),
    [recent, favorites, byId],
  );

  const others = useMemo(
    () => rootCategories.filter((item) => !favorites.includes(item.id) && !recent.includes(item.id)),
    [rootCategories, favorites, recent],
  );


  const quick = useMemo(
    () => [...favoriteList, ...recentList, ...others].slice(0, 8),
    [favoriteList, recentList, others],
  );

  function pick(id: string) {
    onChange(id);
    rememberCategory(id);
    sync();
    setOpen(false);
  }

  function toggleFavorite(id: string) {
    const current = readList(FAVORITE_KEY);
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [id, ...current].slice(0, MAX_FAVORITES);
    writeList(FAVORITE_KEY, next);
    setFavorites(next);
  }

  /** Navegação por setas entre os atalhos, com Enter/Espaço para selecionar. */
  function handleChipKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const last = quick.length - 1;
    let next = chipIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = chipIndex >= last ? 0 : chipIndex + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = chipIndex <= 0 ? last : chipIndex - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    setChipIndex(next);
    const node = chipsRef.current?.querySelectorAll<HTMLButtonElement>("button[data-chip]")[next];
    node?.focus();
  }

  function renderItems(list: (PickerCategory & { parent_id?: string | null })[]) {
    return list.map((category) => {
      const Icon = categoryIcon(category.icon);
      const isFavorite = favorites.includes(category.id);
      const children = subCategories.get(category.id) || [];

      return (
        <div key={category.id}>
          <CommandItem
            value={category.name}
            onSelect={() => pick(category.id)}
            className="gap-2 py-2.5"
          >
            <Icon className="size-4 shrink-0" style={{ color: category.color ?? undefined }} />
            <span className="truncate">{category.name}</span>
            <span className="ml-auto flex items-center gap-1">
              {value === category.id ? <GlyphCheck className="size-4 text-primary" /> : null}
              <span
                role="button"
                tabIndex={-1}
                aria-label={isFavorite ? "Remover dos favoritos" : "Marcar como favorita"}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(category.id);
                }}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-amber-500",
                )}
              >
                <GlyphStar filled={isFavorite} className="size-3.5" />
              </span>
            </span>
          </CommandItem>
          {children.length > 0 && (
            <div className="ml-4 border-l pl-2">
              {children.map(sub => {
                const SubIcon = categoryIcon(sub.icon);
                return (
                  <CommandItem
                    key={sub.id}
                    value={`${category.name} ${sub.name}`}
                    onSelect={() => pick(sub.id)}
                    className="gap-2 py-1.5 text-xs"
                  >
                    <SubIcon className="size-3.5 shrink-0 opacity-70" style={{ color: sub.color ?? undefined }} />
                    <span className="truncate">{sub.name}</span>
                    {value === sub.id ? <GlyphCheck className="size-3.5 text-primary ml-auto" /> : null}
                  </CommandItem>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  }


  const TriggerIcon = selected ? categoryIcon(selected.icon) : GlyphSearch;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            data-category-trigger
            className="mt-1.5 h-11 w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              <TriggerIcon
                className="size-4 shrink-0"
                style={{ color: selected?.color ?? undefined }}
              />
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selected ? selected.name : "Selecione a categoria"}
              </span>
            </span>
            <GlyphSelector className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command
            loop
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder={placeholder} />
            <CommandList className="max-h-72">
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              {favoriteList.length > 0 ? (
                <CommandGroup heading="Favoritas">{renderItems(favoriteList)}</CommandGroup>
              ) : null}
              {recentList.length > 0 ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recentes">{renderItems(recentList)}</CommandGroup>
                </>
              ) : null}
              {others.length > 0 ? (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Todas as categorias">{renderItems(others)}</CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
          <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            Use ↑ ↓ para navegar, Enter para escolher e a estrela para favoritar.
          </p>
        </PopoverContent>
      </Popover>

      {quick.length > 0 ? (
        <div
          ref={chipsRef}
          role="listbox"
          aria-label="Categorias favoritas e recentes"
          onKeyDown={handleChipKeys}
          className="flex flex-wrap gap-1.5"
        >
          {quick.map((category, index) => {
            const Icon = categoryIcon(category.icon);
            const active = value === category.id;
            const isFavorite = favorites.includes(category.id);
            return (
              <button
                key={category.id}
                data-chip
                type="button"
                role="option"
                aria-selected={active}
                tabIndex={index === chipIndex ? 0 : -1}
                onFocus={() => setChipIndex(index)}
                onClick={() => pick(category.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {isFavorite ? (
                  <GlyphStar filled className="size-3 text-amber-500" />
                ) : recent.includes(category.id) ? (
                  <GlyphClock className="size-3 opacity-70" />
                ) : null}
                <Icon className="size-3.5" style={{ color: category.color ?? undefined }} />
                <span className="max-w-24 truncate">{category.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {autoFilled && selected ? (
        <p className="text-[11px] text-muted-foreground">
          Pré-preenchido com base no seu último lançamento.
        </p>
      ) : null}
    </div>
  );
}
