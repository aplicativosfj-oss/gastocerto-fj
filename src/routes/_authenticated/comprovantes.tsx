import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye, FileText, Paperclip, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ReceiptViewer } from "@/components/finance/receipt-viewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { useDeleteReceipt, useReceipts, type ReceiptItem } from "@/lib/receipts";
import { downloadReceipt, isPdfPath } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/comprovantes")({
  head: () => ({
    meta: [
      { title: "Comprovantes — GastoCerto" },
      {
        name: "description",
        content: "Visualize, baixe e remova os comprovantes anexados aos seus lançamentos.",
      },
      { property: "og:title", content: "Comprovantes — GastoCerto" },
      {
        property: "og:description",
        content: "Visualize, baixe e remova os comprovantes anexados aos seus lançamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { data: receipts, isLoading } = useReceipts();
  const remove = useDeleteReceipt();

  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("all");
  const [preview, setPreview] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ReceiptItem | null>(null);

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (receipts ?? []).filter((item) => {
      if (origin !== "all" && item.origin !== origin) return false;
      if (term && !item.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [receipts, search, origin]);

  async function handleDownload(item: ReceiptItem) {
    try {
      await downloadReceipt(item.path);
    } catch (error) {
      console.error("[comprovantes] falha ao baixar", error);
      toast.error("Não foi possível baixar o arquivo.");
    }
  }

  async function handleRemove(item: ReceiptItem) {
    try {
      await remove.mutateAsync(item);
      setConfirm(null);
      toast.success("Comprovante removido.");
    } catch (error) {
      console.error("[comprovantes] falha ao remover", error);
      toast.error("Não foi possível remover o comprovante.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Comprovantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(receipts ?? []).length} arquivo(s) anexados a lançamentos e abastecimentos.
          </p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_200px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por descrição"
            aria-label="Buscar comprovante"
            maxLength={80}
          />
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger aria-label="Filtrar por origem">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="transaction">Lançamentos</SelectItem>
              <SelectItem value="fuel">Abastecimentos</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Paperclip className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum comprovante encontrado. Anexe arquivos ao registrar despesas, receitas ou
              abastecimentos.
            </p>
          </section>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((item) => (
              <li
                key={`${item.origin}-${item.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
                    {isPdfPath(item.path) ? (
                      <FileText className="size-4" />
                    ) : (
                      <Paperclip className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(item.date)} · {formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {item.origin === "fuel" ? "Abastecimento" : "Lançamento"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Visualizar comprovante de ${item.title}`}
                    onClick={() => setPreview(item.path)}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Baixar comprovante de ${item.title}`}
                    onClick={() => handleDownload(item)}
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover comprovante de ${item.title}`}
                    onClick={() => setConfirm(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReceiptViewer
        path={preview}
        open={preview !== null}
        onOpenChange={(value) => !value && setPreview(null)}
      />

      <AlertDialog open={confirm !== null} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover comprovante?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo será excluído definitivamente e desvinculado do registro. O lançamento em
              si permanece.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => confirm && handleRemove(confirm)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
