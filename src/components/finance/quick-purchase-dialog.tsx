import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PurchaseItemsEditor } from "@/components/finance/purchase-items-editor";
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
import { PAYMENT_METHODS, parseAmount, toCents } from "@/lib/finance";
import {
  itemFromRow,
  useSaveTransactionItems,
  useTransactionItems,
  validatePurchaseItems,
  type ItemDraft,
} from "@/lib/purchase-items";
import { useSaveTransaction, type Transaction } from "@/lib/transactions";

/**
 * Edição rápida da compra direto do fechamento mensal: itens, quantidades,
 * peso, valor e forma de pagamento, sem abrir o formulário completo.
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
  const save = useSaveTransaction();
  const saveItems = useSaveTransactionItems();

  const [items, setItems] = useState<ItemDraft[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [merchant, setMerchant] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !transaction) return;
    setAmount(String(transaction.amount).replace(".", ","));
    setPaymentMethod(transaction.payment_method ?? "pix");
    setMerchant(transaction.merchant_name ?? "");
    setError("");
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

    try {
      await save.mutateAsync({
        id: transaction.id,
        values: {
          description: transaction.description,
          amount: value,
          transaction_type: transaction.transaction_type,
          payment_method: paymentMethod,
          merchant_name: merchant ? merchant.slice(0, 100) : null,
        },
      });
      await saveItems.mutateAsync({
        transactionId: transaction.id,
        items: items.filter((item) => item.name.trim().length > 0),
      });
      toast.success("Compra atualizada.");
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
