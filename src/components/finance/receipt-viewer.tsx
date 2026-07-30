import { Download, FileText, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isPdfPath, useReceiptUrl } from "@/lib/storage";

/** Modal de visualização de comprovante (imagem ou PDF) com URL assinada. */
export function ReceiptViewer({
  path,
  open,
  onOpenChange,
}: {
  path: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const url = useReceiptUrl(open ? path : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comprovante</DialogTitle>
          <DialogDescription>
            O arquivo fica em armazenamento privado e o link expira em 1 hora.
          </DialogDescription>
        </DialogHeader>

        {!path ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum comprovante anexado.
          </p>
        ) : !url ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando arquivo…
          </div>
        ) : isPdfPath(path) ? (
          <div className="space-y-3">
            <iframe
              title="Comprovante em PDF"
              src={url}
              className="h-[60vh] w-full rounded-xl border border-border"
            />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="size-4" /> Abrir em nova aba
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <img
              src={url}
              alt="Comprovante do lançamento"
              className="max-h-[60vh] w-full rounded-xl border border-border object-contain"
            />
            <a
              href={url}
              download
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Download className="size-4" /> Baixar comprovante
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
