import { useEffect, useState } from "react";
import { FileCog } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  buildPdfFilename,
  DEFAULT_PDF_PREFERENCES,
  PDF_PLACEHOLDERS,
  usePdfPreferences,
  type PdfPreferences,
} from "@/lib/pdf-preferences";
import { cn } from "@/lib/utils";

/** Ajustes de nome do arquivo, formato da página e marca d'água do PDF. */
export function PdfExportSettingsDialog() {
  const { preferences, update } = usePdfPreferences();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PdfPreferences>(preferences);

  useEffect(() => {
    if (open) setDraft(preferences);
  }, [open, preferences]);

  const preview = buildPdfFilename(draft.filenamePattern, {
    categoria: "Açougue",
    data: "2026-07-29",
    estabelecimento: "Ponto Certo",
    descricao: "Pix enviado",
    valor: "199.32",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileCog className="mr-2 size-4" aria-hidden />
          PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências do PDF</DialogTitle>
          <DialogDescription>
            Personalize o nome do arquivo e o formato. O título do documento sempre mantém
            categoria, data e estabelecimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf-pattern">Nome do arquivo</Label>
            <Input
              id="pdf-pattern"
              value={draft.filenamePattern}
              onChange={(event) => setDraft({ ...draft, filenamePattern: event.target.value })}
              className="mt-1.5"
              placeholder={DEFAULT_PDF_PREFERENCES.filenamePattern}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PDF_PLACEHOLDERS.map((token) => (
                <Button
                  key={token}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[11px]"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      filenamePattern: `${current.filenamePattern}${current.filenamePattern && !current.filenamePattern.endsWith("-") ? "-" : ""}${token}`,
                    }))
                  }
                >
                  {token}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Prévia: <span className="font-mono">{preview}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Tamanho
              </Label>
              <div className="mt-1.5 flex gap-2">
                {(["a4", "letter"] as const).map((size) => (
                  <Button
                    key={size}
                    type="button"
                    size="sm"
                    variant={draft.pageSize === size ? "secondary" : "outline"}
                    className="flex-1"
                    onClick={() => setDraft({ ...draft, pageSize: size })}
                  >
                    {size === "a4" ? "A4" : "Carta"}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Orientação
              </Label>
              <div className="mt-1.5 flex gap-2">
                {(["portrait", "landscape"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={draft.orientation === value ? "secondary" : "outline"}
                    className="flex-1"
                    onClick={() => setDraft({ ...draft, orientation: value })}
                  >
                    {value === "portrait" ? "Retrato" : "Paisagem"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="pdf-watermark" className="text-sm">
                  Marca d'água
                </Label>
                <p className="text-xs text-muted-foreground">
                  Escreve o texto em diagonal em todas as páginas.
                </p>
              </div>
              <Switch
                id="pdf-watermark"
                checked={draft.watermark}
                onCheckedChange={(checked) => setDraft({ ...draft, watermark: checked })}
              />
            </div>
            <Input
              value={draft.watermarkText}
              onChange={(event) => setDraft({ ...draft, watermarkText: event.target.value })}
              maxLength={40}
              placeholder="Controle Gastos"
              className={cn("mt-3", !draft.watermark && "opacity-50")}
              disabled={!draft.watermark}
              aria-label="Texto da marca d'água"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setDraft(DEFAULT_PDF_PREFERENCES)}
            >
              Restaurar padrão
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                update(draft);
                toast.success("Preferências do PDF salvas.");
                setOpen(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
