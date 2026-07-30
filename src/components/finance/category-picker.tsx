import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export type PickerCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

const STORAGE_KEY = "gc:recent-categories";
const MAX_RECENT = 6;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberCategory(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const next = [id, ...readRecent().filter((item) => item !== id)].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  placeholder = "Buscar categoria...",
}: {
  categories: PickerCategory[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecent());
  }, [open]);

  const selected = useMemo(
    () => categories.find((category) => category.id === value) ?? null,
    [categories, value],
  );

  const quick = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const fromRecent = recent
      .map((id) => byId.get(id))
      .filter((item): item is PickerCategory => Boolean(item));
    const fallback = categories.filter((category) => !recent.includes(category.id));
    return [...fromRecent, ...fallback].slice(0, 6);
  }, [categories, recent]);

  function pick(id: string) {
    onChange(id);
    rememberCategory(id);
    setRecent(readRecent());
    setOpen(false);
  }

  const SelectedIcon = selected ? categoryIcon(selected.icon) : Search;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="mt-1.5 h-11 w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              <SelectedIcon
                className="size-4 shrink-0"
                style={{ color: selected?.color ?? undefined }}
              />
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selected ? selected.name : "Selecione a categoria"}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
        >
          <Command
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder={placeholder} />
            <CommandList className="max-h-64">
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              <CommandGroup>
                {categories.map((category) => {
                  const Icon = categoryIcon(category.icon);
                  return (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => pick(category.id)}
                      className="gap-2 py-2.5"
                    >
                      <Icon
                        className="size-4 shrink-0"
                        style={{ color: category.color ?? undefined }}
                      />
                      <span className="truncate">{category.name}</span>
                      {value === category.id ? (
                        <Check className="ml-auto size-4 text-primary" />
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {quick.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {quick.map((category) => {
            const Icon = categoryIcon(category.icon);
            const active = value === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => pick(category.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-3.5" style={{ color: category.color ?? undefined }} />
                <span className="max-w-24 truncate">{category.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
