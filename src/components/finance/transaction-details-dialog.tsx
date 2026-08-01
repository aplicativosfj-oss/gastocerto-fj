import { useEffect, useState } from "react";
import { Check, FileDown, History, NotebookPen, Paperclip, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { ReceiptViewer } from "@/components/finance/receipt-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PAYMENT_METHODS, TRANSACTION_STATUS, EXPENSE_TYPES, labelFor } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import { exportTransactionPdf } from "@/lib/transaction-detail-export";
import { NOTE_FIELD_LABEL, useNoteHistory, useRefreshNoteHistory } from "@/lib/transaction-notes";
import { useSaveTransaction, type Transaction } from "@/lib/transactions";


function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium" title={typeof value === "string" ? value : undefined}>
        {value}
      </p>
    </div>
  );
}

/** Detalhes compactos de um lançamento, com anotações editáveis e comprovante. */
export function TransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
  onEdit,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: Transaction) => void;
}) {
  const { data: categories } = useCategories();
  const saveTransaction = useSaveTransaction();
  const refreshHistory = useRefreshNoteHistory();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history } = useNoteHistory(transaction?.id, open);

  useEffect(() => {
    setEditingNotes(false);
    setHistoryOpen(false);
    setNotesDraft(transaction?.notes ?? "");
  }, [transaction?.id, transaction?.notes, open]);

  if (!transaction) return null;
  const category = (categories ?? []).find((item) => item.id === transaction.category_id);
  const isIncome = transaction.transaction_type === "income";

  async function saveNotes() {
    if (!transaction) return;
    try {
      await saveTransaction.mutateAsync({
        id: transaction.id,
        values: { notes: notesDraft.trim() || null } as never,
      });
      await refreshHistory(transaction.id);
      setEditingNotes(false);
      toast.success("Anotações salvas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar as anotações");
    }
  }

  async function handleExport() {
    if (!transaction) return;
    try {
      await exportTransactionPdf(transaction, {
        categoryName: category?.name,
        history: history ?? [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF");
    }
  }


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto p-4 sm:max-w-md">
          <DialogHeader className="space-y-0.5 text-left">
            <DialogTitle className="text-base leading-tight">{transaction.description}</DialogTitle>
            <DialogDescription className="text-xs">
              {isIncome ? "Receita" : "Despesa"} de {formatDate(transaction.transaction_date)}
              {category ? ` · ${category.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
            <span
              className={`text-2xl font-semibold tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(Number(transaction.amount))}
            </span>
            <Badge
              variant={transaction.status === "overdue" ? "destructive" : "secondary"}
              className="shrink-0"
            >
              {labelFor(TRANSACTION_STATUS, transaction.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Categoria" value={category?.name ?? "Sem categoria"} />
            <Field label="Pagamento" value={labelFor(PAYMENT_METHODS, transaction.payment_method)} />
            {!isIncome ? (
              <Field label="Tipo" value={labelFor(EXPENSE_TYPES, transaction.expense_type)} />
            ) : null}
            {transaction.merchant_name ? (
              <Field label="Estabelecimento" value={transaction.merchant_name} />
            ) : null}
            {transaction.due_date ? (
              <Field label="Vencimento" value={formatDate(transaction.due_date)} />
            ) : null}
            {transaction.payment_date ? (
              <Field label="Pago em" value={formatDate(transaction.payment_date)} />
            ) : null}
            {transaction.total_installments ? (
              <Field
                label="Parcela"
                value={`${transaction.installment_number ?? 1} de ${transaction.total_installments}`}
              />
            ) : null}
            <Field
              label="Comprovante"
              value={
                transaction.attachment_url ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setReceiptOpen(true)}
                  >
                    <Paperclip className="mr-1 size-3" /> Visualizar
                  </Button>
                ) : (
                  "Sem anexo"
                )
              }
            />
          </div>

          {transaction.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {transaction.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <NotebookPen className="size-3.5" /> Suas anotações
              </p>
              {editingNotes ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setNotesDraft(transaction.notes ?? "");
                      setEditingNotes(false);
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={saveTransaction.isPending}
                    onClick={saveNotes}
                  >
                    <Check className="mr-1 size-3" /> Salvar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setEditingNotes(true)}
                >
                  {transaction.notes ? "Editar" : "Adicionar"}
                </Button>
              )}
            </div>
            {editingNotes ? (
              <Textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ex.: licença de app, presente para minha esposa, compra do mês…"
                className="text-xs"
              />
            ) : (
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {transaction.notes || "Nenhuma anotação registrada."}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-full justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              onClick={() => setHistoryOpen((value) => !value)}
            >
              <span className="flex items-center gap-1.5">
                <History className="size-3.5" /> Histórico de alterações
              </span>
              <span>{history?.length ?? 0}</span>
            </Button>
            {historyOpen ? (
              (history ?? []).length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Nenhuma alteração registrada até agora.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {(history ?? []).map((entry) => (
                    <li key={entry.id} className="rounded-md bg-background/60 px-2 py-1.5 text-xs">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {formatDateTime(entry.changed_at)} ·{" "}
                        {NOTE_FIELD_LABEL[entry.field] ?? entry.field}
                      </p>
                      <p className="mt-0.5 line-through text-muted-foreground">
                        {entry.old_value || "(vazio)"}
                      </p>
                      <p className="font-medium">{entry.new_value || "(vazio)"}</p>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 size-3.5" /> PDF
            </Button>

            {onEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(transaction);
                }}
              >
                <Pencil className="mr-2 size-3.5" /> Editar
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptViewer
        path={transaction.attachment_url}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </>
  );
}
