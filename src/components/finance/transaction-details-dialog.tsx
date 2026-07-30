import { useState } from "react";
import { Paperclip, Pencil } from "lucide-react";

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
import { formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_METHODS, TRANSACTION_STATUS, EXPENSE_TYPES, labelFor } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import type { Transaction } from "@/lib/transactions";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

/** Detalhes de um lançamento, com visualização do comprovante em modal. */
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
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!transaction) return null;
  const category = (categories ?? []).find((item) => item.id === transaction.category_id);
  const isIncome = transaction.transaction_type === "income";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{transaction.description}</DialogTitle>
            <DialogDescription>
              {isIncome ? "Receita" : "Despesa"} registrada em {formatDate(transaction.transaction_date)}
            </DialogDescription>
          </DialogHeader>

          <p
            className={`text-3xl font-semibold tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(Number(transaction.amount))}
          </p>

          <div className="mt-2">
            <Row label="Categoria" value={category?.name ?? "Sem categoria"} />
            <Row
              label="Situação"
              value={
                <Badge variant={transaction.status === "overdue" ? "destructive" : "secondary"}>
                  {labelFor(TRANSACTION_STATUS, transaction.status)}
                </Badge>
              }
            />
            <Row
              label="Forma de pagamento"
              value={labelFor(PAYMENT_METHODS, transaction.payment_method)}
            />
            {!isIncome ? (
              <Row label="Tipo de despesa" value={labelFor(EXPENSE_TYPES, transaction.expense_type)} />
            ) : null}
            {transaction.due_date ? (
              <Row label="Vencimento" value={formatDate(transaction.due_date)} />
            ) : null}
            {transaction.payment_date ? (
              <Row label="Pagamento" value={formatDate(transaction.payment_date)} />
            ) : null}
            {transaction.merchant_name ? (
              <Row label="Estabelecimento" value={transaction.merchant_name} />
            ) : null}
            {transaction.total_installments ? (
              <Row
                label="Parcela"
                value={`${transaction.installment_number ?? 1} de ${transaction.total_installments}`}
              />
            ) : null}
            {transaction.tags?.length ? (
              <Row
                label="Tags"
                value={
                  <span className="flex flex-wrap justify-end gap-1">
                    {transaction.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                }
              />
            ) : null}
            {transaction.notes ? <Row label="Observações" value={transaction.notes} /> : null}
            <Row
              label="Comprovante"
              value={
                transaction.attachment_url ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setReceiptOpen(true)}
                  >
                    <Paperclip className="mr-1 size-3.5" /> Visualizar
                  </Button>
                ) : (
                  "Sem anexo"
                )
              }
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {onEdit ? (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onEdit(transaction);
                }}
              >
                <Pencil className="mr-2 size-4" /> Editar
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
