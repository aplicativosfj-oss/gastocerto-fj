import { useMemo } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { readRecentCategories } from "@/components/finance/category-picker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategories } from "@/lib/queries";

export type QuickPick = { categoryId: string | null; subCategoryId: string | null };

/**
 * Menu rápido de categoria e subcategoria para abrir o lançamento em poucos
 * cliques, mantendo a opção de deixar o sistema sugerir.
 */
export function QuickCategoryMenu({
  kind,
  label,
  onPick,
}: {
  kind: "expense" | "income";
  label: string;
  onPick: (pick: QuickPick) => void;
}) {
  const { data: categories } = useCategories();

  const { parents, childrenOf, recent } = useMemo(() => {
    const all = (categories ?? []).filter((category) => category.type === kind);
    const byId = new Map(all.map((category) => [category.id, category]));
    const parents = all
      .filter((category) => !category.parent_id)
      .sort(
        (a, b) =>
          (a.display_order ?? 999) - (b.display_order ?? 999) || a.name.localeCompare(b.name),
      );
    const childrenOf = new Map<string, typeof all>();
    for (const category of all) {
      if (!category.parent_id) continue;
      const list = childrenOf.get(category.parent_id) ?? [];
      list.push(category);
      childrenOf.set(category.parent_id, list);
    }
    const recent = readRecentCategories()
      .map((id) => byId.get(id))
      .filter((category): category is (typeof all)[number] => Boolean(category))
      .slice(0, 5);
    return { parents, childrenOf, recent };
  }, [categories, kind]);

  function pick(category: { id: string; parent_id: string | null }) {
    onPick(
      category.parent_id
        ? { categoryId: category.parent_id, subCategoryId: category.id }
        : { categoryId: category.id, subCategoryId: null },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 size-4" />
          {label}
          <ChevronDown className="ml-2 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onPick({ categoryId: null, subCategoryId: null })}>
          Sem categoria (usar sugestão)
        </DropdownMenuItem>
        {recent.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Usadas recentemente</DropdownMenuLabel>
            {recent.map((category) => (
              <DropdownMenuItem key={`recent-${category.id}`} onSelect={() => pick(category)}>
                {category.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">
          {kind === "income" ? "Fontes de renda" : "Categorias"}
        </DropdownMenuLabel>
        {parents.length === 0 ? (
          <DropdownMenuItem disabled>Nenhuma categoria cadastrada</DropdownMenuItem>
        ) : null}
        {parents.map((category) => {
          const children = childrenOf.get(category.id) ?? [];
          if (children.length === 0) {
            return (
              <DropdownMenuItem key={category.id} onSelect={() => pick(category)}>
                {category.name}
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuSub key={category.id}>
              <DropdownMenuSubTrigger>{category.name}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[60vh] overflow-y-auto">
                <DropdownMenuItem onSelect={() => pick(category)}>
                  Todo {category.name}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {children.map((child) => (
                  <DropdownMenuItem key={child.id} onSelect={() => pick(child)}>
                    {child.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
