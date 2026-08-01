import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
import { CategoryAutofixCard } from "@/components/finance/category-autofix-card";
import { MetaChip, PageHeader } from "@/components/finance/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_ICON_KEYS, categoryIcon } from "@/lib/category-icons";
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
  "#38bdf8",
  "#64748b",
];

type Draft = {
  id?: string;
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string;
  display_order?: number;
  parent_id?: string | null;
};


function CategoriesPage() {
  const today = new Date();
  const range = monthRange(today.getFullYear(), today.getMonth() + 1);
  const { data: categories, isLoading } = useCategories();
  const { data: transactions } = useTransactions(range);
  const save = useSaveCategory();
  const refresh = useRefreshFinance();

  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [draft, setDraft] = useState<(Draft & { description?: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ id: string; name: string; next: boolean } | null>(null);
  const [toggling, setToggling] = useState(false);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of transactions ?? []) {
      if (!row.category_id) continue;
      map.set(row.category_id, (map.get(row.category_id) ?? 0) + Number(row.amount));
    }
    return map;
  }, [transactions]);

  const allCategories = (categories ?? [])
    .filter((category) => category.type === tab)
    .sort((a, b) => {
      // Prioritize active ones? No, let's keep the user's order
      return (a.display_order || 0) - (b.display_order || 0);
    });

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
        values: { 
          name, 
          type: draft.type, 
          color: draft.color, 
          icon: draft.icon,
          description: draft.description?.trim() || null,
          display_order: draft.display_order ?? 0,
          parent_id: draft.parent_id || null,
        },

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

  /** Grava o novo estado sem avisos: usado pelo fluxo confirmado e pelo desfazer. */
  async function applyActive(id: string, active: boolean) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ active })
      .eq("id", id);
    if (updateError) {
      console.error("[categorias] falha ao alterar", updateError.message);
      toast.error("Não foi possível alterar a categoria.");
      return false;
    }
    await refresh();
    return true;
  }

  /** Confirma, aplica e oferece desfazer imediato por 8 segundos. */
  async function confirmToggle() {
    if (!pending) return;
    const { id, name, next } = pending;
    setToggling(true);
    const ok = await applyActive(id, next);
    setToggling(false);
    setPending(null);
    if (!ok) return;
    toast.success(next ? `"${name}" foi reativada.` : `"${name}" foi desativada.`, {
      duration: 8000,
      description: next
        ? "Ela volta a aparecer nos lançamentos."
        : "Nada foi excluído: seus lançamentos antigos continuam intactos.",
      action: {
        label: "Desfazer",
        onClick: () => {
          void applyActive(id, !next).then((reverted) => {
            if (reverted) toast.info(`"${name}" restaurada ao estado anterior.`);
          });
        },
      },
    });
  }

  async function updateOrder(id: string, order: number) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ display_order: order })
      .eq("id", id);
    if (updateError) {
      console.error("[categorias] falha ao ordenar", updateError.message);
      toast.error("Não foi possível salvar a ordem.");
      return;
    }
    await refresh();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          icon={Plus}
          eyebrow="Configuração"
          title="Categorias"
          description="Organize seus gastos e receitas do jeito que faz sentido para você."
          className="lg:p-4"
          actions={
            <Button
              onClick={() => {
                setError(null);
                setDraft({ 
                  name: "", 
                  type: tab, 
                  color: COLORS[0], 
                  icon: "circle-ellipsis",
                  display_order: allCategories.length,
                  parent_id: null
                });
              }}
            >
              <Plus className="mr-2 size-4" />
              Nova categoria
            </Button>
          }
        />

        <Tabs value={tab} onValueChange={(value) => setTab(value as "expense" | "income")}>
          <TabsList>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
          </TabsList>
        </Tabs>

        <CategoryAutofixCard />


        {isLoading ? (
          <div className="grid gap-3 auto-cards-sm">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : allCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma categoria por aqui ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 auto-cards-sm">
            {allCategories.map((category) => {
              const isActive = category.active !== false;
              return (
                <div
                  key={category.id}
                  className={cn(
                    "interactive-card group relative flex items-start justify-between gap-3 rounded-xl border p-4 transition-all duration-300",
                    isActive 
                      ? "border-border bg-card shadow-soft hover:shadow-md" 
                      : "border-border/40 bg-muted/30 grayscale opacity-70 shadow-inner scale-[0.98] translate-y-0.5"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-xl transition-all duration-300",
                          isActive ? "group-hover:scale-110" : "scale-95 opacity-50"
                        )}
                        style={{
                          backgroundColor: `${category.color ?? "#94a3b8"}15`,
                          color: category.color ?? "#94a3b8",
                        }}
                      >
                        {(() => {
                          const Icon = categoryIcon(category.icon);
                          return <Icon className="size-4.5" />;
                        })()}
                      </span>
                      <div className="min-w-0">
                        <span className={cn(
                          "block truncate text-[14px] font-bold tracking-tight transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {category.name}
                        </span>
                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                          {isActive ? `Gasto: ${formatCurrency(usage.get(category.id) ?? 0)}` : "Desativada"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar categoria ${category.name}`}
                        className="size-9 rounded-lg"
                        onClick={() => {
                          setError(null);
                          setDraft({
                            id: category.id,
                            name: category.name,
                            type: category.type as "expense" | "income",
                            color: category.color ?? COLORS[0],
                            icon: category.icon ?? "circle-ellipsis",
                            display_order: category.display_order ?? 0,
                            parent_id: category.parent_id,
                            description: category.description
                          });
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`category-active-${category.id}`}
                        className={cn(
                          "cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider transition-colors",
                          isActive ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {isActive ? "Ativa" : "Inativa"}
                      </label>
                      <Switch
                        id={`category-active-${category.id}`}
                        checked={isActive}
                        aria-label={`${isActive ? "Desativar" : "Ativar"} a categoria ${category.name}`}
                        aria-describedby={`category-active-hint-${category.id}`}
                        onCheckedChange={(checked) =>
                          setPending({ id: category.id, name: category.name, next: checked })
                        }
                        className={cn(
                          "transition-all duration-500 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          !isActive && "opacity-70",
                        )}
                      />
                      <span id={`category-active-hint-${category.id}`} className="sr-only">
                        {isActive
                          ? "Categoria ativa e disponível nos lançamentos. Desativar não exclui nada."
                          : "Categoria desativada. Ative para voltar a usá-la nos lançamentos."}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
              <Label htmlFor="category-name">Nome da categoria ou estabelecimento</Label>
              <Input
                id="category-name"
                value={draft?.name ?? ""}
                maxLength={40}
                className="mt-1.5"
                placeholder="Ex: Supermercado, Farmácia, Salário..."
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                }
              />
              {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
            </div>

            <div>
              <Label htmlFor="category-desc">Descrição / Nota da Categoria</Label>
              <Input
                id="category-desc"
                value={draft?.description ?? ""}
                className="mt-1.5"
                placeholder="Ex.: Gastos com reparos, peças e mecânica"
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, description: event.target.value } : current))
                }
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Esta descrição é exibida durante o lançamento para orientar o preenchimento.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <Label htmlFor="category-order">Ordem (menor aparece primeiro)</Label>
                <Input
                  id="category-order"
                  type="number"
                  value={draft?.display_order ?? 0}
                  className="mt-1.5"
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, display_order: Number(event.target.value) } : current))
                  }
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category-parent">Categoria Pai (opcional para subcategoria)</Label>
              <Select
                value={draft?.parent_id ?? "none"}
                onValueChange={(value) =>
                  setDraft((current) =>
                    current ? { ...current, parent_id: value === "none" ? null : value } : current,
                  )
                }
              >
                <SelectTrigger id="category-parent" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Categoria Principal)</SelectItem>
                  {(categories ?? [])
                    .filter((c) => c.type === draft?.type && !c.parent_id && c.id !== draft?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
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

            <div>
              <Label>Ícone</Label>
              <div className="mt-2 grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-10">
                {CATEGORY_ICON_KEYS.map((key) => {
                  const Icon = categoryIcon(key);
                  const active = draft?.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`Ícone ${key}`}
                      aria-pressed={active}
                      onClick={() =>
                        setDraft((current) => (current ? { ...current, icon: key } : current))
                      }
                      className={`grid aspect-square place-items-center rounded-lg border transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
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

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.next ? "Ativar categoria?" : "Desativar categoria?"}
        description={
          pending?.next
            ? `"${pending.name}" volta a aparecer na lista de lançamentos.`
            : `"${pending?.name}" deixa de aparecer em novos lançamentos. Nada é excluído e você pode reativar quando quiser.`
        }
        confirmLabel={pending?.next ? "Ativar" : "Desativar"}
        tone={pending?.next ? "default" : "destructive"}
        loading={toggling}
        onConfirm={confirmToggle}
      />
    </AppShell>
  );
}
