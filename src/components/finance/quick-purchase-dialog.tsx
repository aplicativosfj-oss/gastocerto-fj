import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PurchaseItemsEditor } from "@/components/finance/purchase-items-editor";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, labelFor, parseAmount, toCents } from "@/lib/finance";
import { formatDateTime } from "@/lib/format";
import {
  AUDIT_ACTIONS,
  buildPurchaseChanges,
  readChanges,
  useLogPurchaseAudit,
  usePurchaseAudit,
} from "@/lib/purchase-audit";
import {
  itemFromRow,
  useSaveTransactionItems,
  useTransactionItems,
  validatePurchaseItems,
  type ItemDraft,
} from "@/lib/purchase-items";
import { useProfile } from "@/lib/queries";
import { useSaveTransaction, type Transaction } from "@/lib/transactions";

/**
 * Edição rápida da compra direto do fechamento mensal: itens, quantidades,
 * peso, valor e forma de pagamento, sem abrir o formulário completo. Toda
 * alteração é gravada no histórico de auditoria da compra.
 */
export function QuickPurchaseDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: existingItems } = useTransactionItems(open ? transaction?.id : null);
  const { data: auditRows } = usePurchaseAudit(open ? transaction?.id : null);
  const { data: profile } = useProfile();
  const save = useSaveTransaction();
  const saveItems = useSaveTransactionItems();
  const logAudit = useLogPurchaseAudit();

  const [items, setItems] = useState<ItemDraft[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [merchant, setMerchant] = useState("");
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setAmount(String(transaction.amount).replace(".", ","));
    setPaymentMethod(transaction.payment_method ?? "pix");
    setMerchant(transaction.merchant_name ?? "");
    setError("");
    setShowHistory(false);
  }, [open, transaction]);

  useEffect(() => {
    if (!open) return;
    setItems((existingItems ?? []).map(itemFromRow));
  }, [open, existingItems]);

  const value = toCents(parseAmount(amount));

  async function handleSave() {
    if (!transaction) return;
    if (value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    const check = validatePurchaseItems(items, value);
    if (check.issues.length > 0) {
      setError("Corrija os itens destacados.");
      return;
    }
    if (check.totalMismatch) {
      setError("A soma dos itens não bate com o valor do gasto.");
      return;
    }

    const nextMerchant = merchant ? merchant.slice(0, 100) : null;
    const changes = buildPurchaseChanges({
      before: {
        amount: Number(transaction.amount),
        merchant: transaction.merchant_name,
        paymentMethod: transaction.payment_method
          ? labelFor(PAYMENT_METHODS, transaction.payment_method)
          : null,
      },
      after: {
        amount: value,
        merchant: nextMerchant,
        paymentMethod: labelFor(PAYMENT_METHODS, paymentMethod),
      },
      itemsBefore: existingItems ?? [],
      itemsAfter: items,
      itemFromRow,
    });

    try {
      await save.mutateAsync({
        id: transaction.id,
        values: {
          description: transaction.description,
          amount: value,
          transaction_type: transaction.transaction_type,
          payment_method: paymentMethod,
          merchant_name: nextMerchant,
        },
      });
      await saveItems.mutateAsync({
        transactionId: transaction.id,
        items: items.filter((item) => item.name.trim().length > 0),
      });
      if (changes.length > 0) {
        await logAudit.mutateAsync({
          transactionId: transaction.id,
          action: "quick_edit",
          actorName: profile?.full_name ?? null,
          changes,
        });
      }
      toast.success("Compra atualizada.", {
        description:
          changes.length > 0 ? `${changes.length} alteração(ões) registrada(s) no histórico.` : undefined,
      });
      onOpenChange(false);
    } catch (saveError) {
      toast.error("Não foi possível salvar.", {
        description: saveError instanceof Error ? saveError.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edição rápida da compra</DialogTitle>
          <DialogDescription>
            {transaction?.description ?? "Compra"} — ajuste itens, quantidades, peso e forma de
            pagamento sem sair do fechamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="quick-amount">Valor total (R$)</Label>
            <Input
              id="quick-amount"
              value={amount}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1.5 tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="quick-payment">Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="quick-payment" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="quick-merchant">Estabelecimento</Label>
            <Input
              id="quick-merchant"
              value={merchant}
              maxLength={100}
              onChange={(event) => setMerchant(event.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <PurchaseItemsEditor
          items={items}
          onChange={setItems}
          amount={value}
          showValidation
          onApplyTotal={(total) => setAmount(String(total).replace(".", ","))}
        />

        <section className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <History className="size-3.5 text-muted-foreground" />
              Histórico de alterações
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {(auditRows ?? []).length}
              </Badge>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowHistory((previous) => !previous)}
              aria-expanded={showHistory}
            >
              {showHistory ? "Ocultar" : "Ver histórico"}
            </Button>
          </div>

          {showHistory ? (
            (auditRows ?? []).length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Nenhuma alteração registrada nesta compra ainda.
              </p>
            ) : (
              <ol className="mt-2 space-y-2">
                {(auditRows ?? []).map((row) => {
                  const changes = readChanges(row);
                  return (
                    <li key={row.id} className="rounded-md border border-border/70 bg-card p-2">
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(row.created_at)} ·{" "}
                        {AUDIT_ACTIONS[row.action] ?? row.action} ·{" "}
                        {row.actor_name ?? "Usuário"}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-[11px]">
                        {changes.map((change, index) => (
                          <li key={`${row.id}-${index}`} className="flex flex-wrap gap-1">
                            <span className="font-medium">{change.label}:</span>
                            <span className="text-muted-foreground line-through">
                              {change.before}
                            </span>
                            <span aria-hidden>→</span>
                            <span>{change.after}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            )
          ) : null}
        </section>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending || saveItems.isPending}>
            Salvar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
