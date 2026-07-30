import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ReceiptViewer } from "@/components/finance/receipt-viewer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { removeReceipt, uploadReceipt } from "@/lib/storage";

/** Campo de upload de comprovante com pré-visualização em modal. */
export function ReceiptField({
  value,
  onChange,
  label = "Comprovante",
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = await uploadReceipt(file, user.id);
      onChange(path);
      toast.success("Comprovante anexado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    const path = value;
    onChange(null);
    await removeReceipt(path).catch(() => undefined);
  }

  return (
    <div>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Paperclip className="mr-2 size-4" />
          )}
          {value ? "Trocar arquivo" : "Anexar arquivo"}
        </Button>
        {value ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(true)}>
              Ver comprovante
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <Trash2 className="mr-2 size-4" />
              Remover
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">JPG, PNG, WEBP ou PDF até 5 MB</span>
        )}
      </div>
      <ReceiptViewer path={value} open={preview} onOpenChange={setPreview} />
    </div>
  );
}
