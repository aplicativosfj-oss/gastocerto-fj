import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  moveInList,
  sortBySavedOrder,
  useNavLabels,
  type NavLabelMap,
  type NavOrderMap,
} from "@/lib/nav-labels";

export type NavConfigItem = { key: string; fallback: string; children?: NavConfigItem[] };

/**
 * Central de configurações do menu lateral: renomear e reordenar qualquer seção
 * (incluindo categorias e veículos) sem editar código.
 */
export function NavLabelsDialog({ groups }: { groups: NavConfigItem[] }) {
  const { labels, order, save, saveOrder, reset } = useNavLabels();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NavLabelMap>({});
  const [tree, setTree] = useState<NavConfigItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(labels);
    setTree(
      sortBySavedOrder(groups, order["root"]).map((group) => ({
        ...group,
        children: group.children ? sortBySavedOrder(group.children, order[group.key]) : undefined,
      })),
    );
  }, [open, labels, order, groups]);

  function moveGroup(index: number, direction: -1 | 1) {
    setTree((current) => moveInList(current, index, direction));
  }

  function moveChild(groupKey: string, index: number, direction: -1 | 1) {
    setTree((current) =>
      current.map((group) =>
        group.key === groupKey && group.children
          ? { ...group, children: moveInList(group.children, index, direction) }
          : group,
      ),
    );
  }

  function handleSave() {
    const flat = tree.flatMap((group) => [group, ...(group.children ?? [])]);
    const nextLabels: NavLabelMap = {};
    for (const item of flat) {
      const value = (draft[item.key] ?? "").trim();
      if (value && value !== item.fallback) nextLabels[item.key] = value.slice(0, 32);
    }

    const nextOrder: NavOrderMap = { root: tree.map((group) => group.key) };
    for (const group of tree) {
      if (group.children?.length) nextOrder[group.key] = group.children.map((child) => child.key);
    }

    save(nextLabels);
    saveOrder(nextOrder);
    toast.success("Menu atualizado.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          aria-label="Configurar menu lateral"
        >
          <Settings2 className="size-4" />
          Configurar menu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar o menu</DialogTitle>
          <DialogDescription>
            Renomeie e reordene as seções e subseções do menu lateral. Deixe o nome em branco para
            voltar ao original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {tree.map((group, groupIndex) => (
            <div key={group.key} className="rounded-xl border border-border p-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`nav-${group.key}`}>{group.fallback}</Label>
                  <Input
                    id={`nav-${group.key}`}
                    className="mt-1.5"
                    maxLength={32}
                    placeholder={group.fallback}
                    value={draft[group.key] ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [group.key]: event.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Mover ${group.fallback} para cima`}
                    disabled={groupIndex === 0}
                    onClick={() => moveGroup(groupIndex, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Mover ${group.fallback} para baixo`}
                    disabled={groupIndex === tree.length - 1}
                    onClick={() => moveGroup(groupIndex, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>

              {group.children?.length ? (
                <ul className="mt-3 space-y-2 border-l border-border pl-3">
                  {group.children.map((child, childIndex) => (
                    <li key={child.key} className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`nav-${child.key}`} className="text-xs">
                          {child.fallback}
                        </Label>
                        <Input
                          id={`nav-${child.key}`}
                          className="mt-1 h-9"
                          maxLength={32}
                          placeholder={child.fallback}
                          value={draft[child.key] ?? ""}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, [child.key]: event.target.value }))
                          }
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Mover ${child.fallback} para cima`}
                          disabled={childIndex === 0}
                          onClick={() => moveChild(group.key, childIndex, -1)}
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Mover ${child.fallback} para baixo`}
                          disabled={childIndex === (group.children?.length ?? 0) - 1}
                          onClick={() => moveChild(group.key, childIndex, 1)}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              setDraft({});
              toast.success("Menu restaurado ao padrão.");
              setOpen(false);
            }}
          >
            Restaurar padrão
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
