import { useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
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
import { useNavLabels, type NavLabelMap } from "@/lib/nav-labels";

export type NavLabelField = { key: string; fallback: string };

/** Permite renomear as seções do menu lateral sem editar código. */
export function NavLabelsDialog({ fields }: { fields: NavLabelField[] }) {
  const { labels, save, reset } = useNavLabels();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NavLabelMap>({});

  useEffect(() => {
    if (open) setDraft(labels);
  }, [open, labels]);

  function handleSave() {
    const next: NavLabelMap = {};
    for (const field of fields) {
      const value = (draft[field.key] ?? "").trim();
      if (value && value !== field.fallback) next[field.key] = value.slice(0, 32);
    }
    save(next);
    toast.success("Rótulos do menu atualizados.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          aria-label="Personalizar rótulos do menu"
        >
          <Settings2 className="size-4" />
          Renomear menu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar o menu</DialogTitle>
          <DialogDescription>
            Escolha o nome de cada seção do menu lateral. Deixe em branco para voltar ao nome
            original.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {fields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={`nav-${field.key}`}>{field.fallback}</Label>
              <Input
                id={`nav-${field.key}`}
                className="mt-1.5"
                maxLength={32}
                placeholder={field.fallback}
                value={draft[field.key] ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
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
              toast.success("Rótulos restaurados.");
              setOpen(false);
            }}
          >
            Restaurar padrão
          </Button>
          <Button type="button" onClick={handleSave}>
            <Loader2 className="mr-2 hidden size-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
