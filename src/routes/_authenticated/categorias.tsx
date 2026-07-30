import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { monthRange } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import { useRefreshFinance, useSaveCategory, useTransactions } from "@/lib/transactions";
import { sanitizeText } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — GastoCerto" },
      { name: "description", content: "Crie e organize as categorias dos seus gastos." },
      { property: "og:title", content: "Categorias — GastoCerto" },
      { property: "og:description", content: "Crie e organize as categorias dos seus gastos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoriesPage,
});

const COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#14b8a6",
  "#ec4899",
  "#64748b",
];

type Draft = {
  id?: string;
  name: string;
  type: "expense" | "income";
  color: string;
};

function CategoriesPage() {
  const today = new Date();
  const range = monthRange(today.getFullYear(), today.getMonth() + 1);
  const { data: categories, isLoading } = useCategories();
  const { data: transactions } = useTransactions(range);
  const save = useSaveCategory();
  const refresh = useRefreshFinance();

  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of transactions ?? []) {
      if (!row.category_id) continue;
      map.set(row.category_id, (map.get(row.category_id) ?? 0) + Number(row.amount));
    }
    return map;
  }, [transactions]);

  const visible = (categories ?? []).filter((category) => category.type === tab);

  async function handleSave() {
    if (!draft) return;
    const name = sanitizeText(draft.name);
    if (name.length < 2 || name.length > 40) {
      setError("O nome deve ter entre 2 e 40 caracteres.");
      return;
    }
    const duplicated = (categories ?? []).some(
      (category) =>
        category.id !== draft.id &&
        category.type === draft.type &&
        category.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicated) {
      setError("Já existe uma categoria com esse nome.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await save.mutateAsync({
        id: draft.id,
        values: { name, type: draft.type, color: draft.color },
      });
      setDraft(null);
      toast.success(draft.id ? "Categoria atualizada." : "Categoria criada.");
    } catch (saveError) {
      console.error("[categorias] falha ao salvar", saveError);
      toast.error("Não foi possível salvar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ active })
      .eq("id", id);
    if (updateError) {
      console.error("[categorias] falha ao alterar", updateError.message);
      toast.error("Não foi possível alterar a categoria.");
      return;
    }
    await refresh();
    toast.success(active ? "Categoria reativada." : "Categoria desativada.");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize seus gastos e receitas do jeito que faz sentido para você.
            </p>
          </div>
          <Button
            onClick={() => {
              setError(null);
              setDraft({ name: "", type: tab, color: COLORS[0] });
            }}
          >
            <Plus className="mr-2 size-4" />
            Nova categoria
          </Button>
        </header>

        <Tabs value={tab} onValueChange={(value) => setTab(value as "expense" | "income")}>
          <TabsList>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma categoria por aqui ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((category) => (
              <div
                key={category.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? "#94a3b8" }}
                    />
                    <span className="truncate font-medium">{category.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Este mês: {formatCurrency(usage.get(category.id) ?? 0)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => {
                      setError(null);
                      setDraft({
                        id: category.id,
                        name: category.name,
                        type: category.type as "expense" | "income",
                        color: category.color ?? COLORS[0],
                      });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Desativar ${category.name}`}
                    onClick={() => toggleActive(category.id, false)}
                  >
                    <Power className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>
              Categorias ajudam a entender para onde seu dinheiro está indo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                value={draft?.name ?? ""}
                maxLength={40}
                className="mt-1.5"
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                }
              />
              {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
            </div>

            <div>
              <Label htmlFor="category-type">Tipo</Label>
              <Select
                value={draft?.type ?? "expense"}
                onValueChange={(value) =>
                  setDraft((current) =>
                    current ? { ...current, type: value as "expense" | "income" } : current,
                  )
                }
              >
                <SelectTrigger id="category-type" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cor</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Cor ${color}`}
                    onClick={() =>
                      setDraft((current) => (current ? { ...current, color } : current))
                    }
                    className={`size-7 rounded-full border-2 ${
                      draft?.color === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
