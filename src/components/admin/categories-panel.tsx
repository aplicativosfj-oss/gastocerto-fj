import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_ICON_KEYS, categoryIcon } from "@/lib/category-icons";
import type { CatalogItem } from "@/lib/categories-catalog";
import {
  applyCategoryCatalog,
  getCategoryCatalog,
  saveCategoryCatalog,
} from "@/lib/categories-catalog.functions";

const COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#14b8a6",
  "#ec4899",
  "#1d4ed8",
  "#64748b",
];

/** Painel administrativo para inserir, editar e excluir as categorias padrão. */
export function CategoriesCatalogPanel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [draft, setDraft] = useState<CatalogItem>({
    name: "",
    type: "expense",
    icon: "circle-ellipsis",
    color: COLORS[0],
  });

  const catalog = useQuery({
    queryKey: ["category-catalog"],
    queryFn: () => getCategoryCatalog(),
  });

  const items = useMemo(() => catalog.data ?? [], [catalog.data]);
  const visible = items.filter((item) => item.type === tab);

  const save = useMutation({
    mutationFn: (next: CatalogItem[]) => saveCategoryCatalog({ data: next }),
    onSuccess: (data) => {
      queryClient.setQueryData(["category-catalog"], data);
      toast.success("Catálogo de categorias atualizado.");
    },
    onError: () => toast.error("Não foi possível salvar o catálogo."),
  });

  const apply = useMutation({
    mutationFn: () => applyCategoryCatalog(),
    onSuccess: (result) => toast.success(`Catálogo aplicado a ${result.users} usuário(s).`),
    onError: () => toast.error("Não foi possível aplicar o catálogo."),
  });

  function addItem() {
    const name = draft.name.trim();
    if (name.length < 2) {
      toast.error("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    const duplicated = items.some(
      (item) => item.type === draft.type && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicated) {
      toast.error("Essa categoria já existe no catálogo.");
      return;
    }
    save.mutate([...items, { ...draft, name }]);
    setDraft({ name: "", type: draft.type, icon: "circle-ellipsis", color: COLORS[0] });
  }

  function removeItem(item: CatalogItem) {
    save.mutate(items.filter((row) => !(row.type === item.type && row.name === item.name)));
  }

  function updateItem(item: CatalogItem, patch: Partial<CatalogItem>) {
    save.mutate(
      items.map((row) =>
        row.type === item.type && row.name === item.name ? { ...row, ...patch } : row,
      ),
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Categorias padrão</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estas categorias são criadas para novos clientes. Você pode inserir, editar ou excluir e
            depois aplicar a todos os usuários (nada é apagado das contas existentes).
          </p>
        </div>
        <Button variant="outline" onClick={() => apply.mutate()} disabled={apply.isPending}>
          {apply.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Aplicar a todos
        </Button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <Label htmlFor="catalog-name">Nova categoria</Label>
          <Input
            id="catalog-name"
            className="mt-1.5"
            maxLength={40}
            value={draft.name}
            placeholder="Ex: Consignado, Consórcio..."
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="catalog-type">Tipo</Label>
          <Select
            value={draft.type}
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, type: value as CatalogItem["type"] }))
            }
          >
            <SelectTrigger id="catalog-type" className="mt-1.5 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="income">Entrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="catalog-icon">Ícone</Label>
          <Select
            value={draft.icon}
            onValueChange={(value) => setDraft((current) => ({ ...current, icon: value }))}
          >
            <SelectTrigger id="catalog-icon" className="mt-1.5 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {CATEGORY_ICON_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={addItem} disabled={save.isPending}>
            <Plus className="mr-2 size-4" />
            Inserir
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "expense" | "income")}
        className="mt-4"
      >
        <TabsList>
          <TabsTrigger value="expense">Despesas ({items.filter((i) => i.type === "expense").length})</TabsTrigger>
          <TabsTrigger value="income">Entradas ({items.filter((i) => i.type === "income").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {catalog.isLoading ? (
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma categoria neste tipo.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {visible.map((item) => {
            const Icon = categoryIcon(item.icon);
            return (
              <li
                key={`${item.type}-${item.name}`}
                className="flex items-center gap-2 rounded-xl border border-border p-2"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: `${item.color}22`, color: item.color }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                <Select value={item.color} onValueChange={(value) => updateItem(item, { color: value })}>
                  <SelectTrigger className="w-[104px]" aria-label={`Cor de ${item.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${item.name}`}
                  onClick={() => removeItem(item)}
                  disabled={save.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
