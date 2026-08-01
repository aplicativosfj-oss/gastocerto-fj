import { Loader2, Move, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const OUTPUT_SIZE = 512;
const BOX = 256;

/**
 * Recorte e redimensionamento do avatar com pré-visualização antes de salvar.
 * Gera um JPEG quadrado de 512px a partir da área visível do enquadramento.
 */
export function AvatarCropDialog({
  file,
  onCancel,
  onSave,
  saving,
}: {
  file: File | null;
  onCancel: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
  saving?: boolean;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [preview, setPreview] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!file) {
      setImage(null);
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** Escala mínima para a imagem cobrir todo o quadro de recorte. */
  const baseScale = image ? Math.max(BOX / image.width, BOX / image.height) : 1;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = baseScale * zoom;
    const w = image.width * scale;
    const h = image.height * scale;
    const ratio = OUTPUT_SIZE / BOX;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(
      image,
      (BOX / 2 - w / 2 + offset.x) * ratio,
      (BOX / 2 - h / 2 + offset.y) * ratio,
      w * ratio,
      h * ratio,
    );
    setPreview(canvas.toDataURL("image/jpeg", 0.9));
  }, [baseScale, image, offset.x, offset.y, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!start || !image) return;
    const scale = baseScale * zoom;
    const maxX = Math.max(0, (image.width * scale - BOX) / 2);
    const maxY = Math.max(0, (image.height * scale - BOX) / 2);
    setOffset({
      x: Math.min(maxX, Math.max(-maxX, event.clientX - start.x)),
      y: Math.min(maxY, Math.max(-maxY, event.clientY - start.y)),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.9),
    );
    if (blob) await onSave(blob);
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Ajustar foto do perfil</DialogTitle>
          <DialogDescription className="text-xs">
            Arraste para reposicionar e use o zoom. A prévia mostra exatamente como sua foto vai
            ficar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className="relative size-[256px] shrink-0 cursor-grab overflow-hidden rounded-2xl border border-border bg-muted active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {image ? (
              <img
                src={image.src}
                alt="Pré-visualização do recorte"
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                style={{
                  width: image.width * baseScale * zoom,
                  height: image.height * baseScale * zoom,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/10" />
            <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-background/70" />
          </div>

          <div className="flex w-full flex-col gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Prévia
              </p>
              <div className="mt-2 flex items-center gap-3">
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Prévia do avatar"
                      className="size-16 rounded-full border border-border object-cover"
                    />
                    <img
                      src={preview}
                      alt="Prévia do avatar pequeno"
                      className="size-9 rounded-full border border-border object-cover"
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                <ZoomIn className="size-3" aria-hidden /> Zoom
              </p>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={([value]) => setZoom(value ?? 1)}
                aria-label="Zoom da foto"
              />
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Move className="size-3" aria-hidden /> Arraste a imagem para enquadrar
              </p>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} width={OUTPUT_SIZE} height={OUTPUT_SIZE} className="hidden" />

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!image || saving}>
            {saving ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
            Salvar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
