import { useEffect, useState } from "react";
import { Flame, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GAS_SIZES, useDeleteGasRefill, useSaveGasRefill, type GasRefill } from "@/lib/gas";
import { isoDate, parseAmount, PAYMENT_METHODS } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import { useSaveTransaction } from "@/lib/transactions";

/**
 * Registro de troca do botijão de gás. Opcionalmente lança a compra também
 * como despesa, na categoria "Gás".
 */
export function GasRefillDialog({
  open,
  onOpenChange,
  refill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refill?: GasRefill | null;
}) {
  const save = useSaveGasRefill();
  const remove = useDeleteGasRefill();
  const saveTransaction = useSaveTransaction();
  const { data: categories } = useCategories();

  const [date, setDate] = useState(isoDate(new Date()));
  const [amount, setAmount] = useState("");
  const [size, setSize] = useState("13");
  const [supplier, setSupplier] = useState("");
  const [method, setMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [createExpense, setCreateExpense] = useState(true);

  useEffect(() => {
    if (!open) return;
    setDate(refill?.refill_date ?? isoDate(new Date()));
    setAmount(refill ? String(Number(refill.amount)).replace(".", ",") : "");
    setSize(String(refill?.size_kg ?? 13));
    setSupplier(refill?.supplier ?? "");
    setMethod(refill?.payment_method ?? "pix");
    setNotes(refill?.notes ?? "");
    setCreateExpense(!refill);
  }, [open, refill]);

  const value = parseAmount(amount);

  async function handleSave() {
    if (!date) {
      toast.error("Informe a data da troca do gás.");
      return;
    }
    if (value <= 0) {
      toast.error("Informe o valor pago no botijão.");
      return;
    }

    let transactionId = refill?.transaction_id ?? null;

    if (createExpense && !refill) {
      const category = (categories ?? []).find(
        (item) => item.type === "expense" && item.name.toLowerCase() === "gás",
      );
      try {
        const created = await saveTransaction.mutateAsync({
          values: {
            description: `Botijão de gás${supplier ? ` — ${supplier}` : ""}`,
            amount: value,
            transaction_type: "expense",
            transaction_date: date,
            payment_date: date,
            status: "paid",
            payment_method: method,
            category_id: category?.id ?? null,
            tags: ["gas"],
          },
        });
        transactionId = created.id;
      } catch (error) {
        console.error("[gas] falha ao lançar despesa", error);
        toast.error(
          "A troca foi registrada, mas não foi possível criar o lançamento financeiro.",
        );
      }
    }

    try {
      await save.mutateAsync({
        id: refill?.id,
        values: {
          refill_date: date,
          amount: value,
          size_kg: Number(size),
          supplier: supplier.trim() || null,
          payment_method: method,
          notes: notes.trim() || null,
          transaction_id: transactionId,
        },
      });
      toast.success(refill ? "Troca atualizada!" : "Troca de gás registrada!");
      onOpenChange(false);
    } catch (error) {
      console.error("[gas] falha ao salvar", error);
      toast.error("Não foi possível salvar a troca de gás.");
    }
  }

  async function handleDelete() {
    if (!refill) return;
    try {
      await remove.mutateAsync(refill.id);
      toast.success("Registro removido.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível remover o registro.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="size-4 text-[oklch(0.72_0.17_45)]" aria-hidden />
            {refill ? "Editar troca de gás" : "Registrar troca de gás"}
          </DialogTitle>
          <DialogDescription>
            A data da troca é o dia em que o gás acabou e você comprou o botijão novo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gas-date">Data da troca</Label>
            <Input
              id="gas-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="gas-amount">Valor pago (R$)</Label>
            <MoneyInput
              id="gas-amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="0,00"
              className="mt-1.5 tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="gas-size">Tamanho do botijão</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id="gas-size" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAS_SIZES.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gas-method">Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="gas-method" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="gas-supplier">Revenda / fornecedor</Label>
            <Input
              id="gas-supplier"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="Ex.: Ultragaz do bairro"
              className="mt-1.5"
              maxLength={80}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="gas-notes">Observações</Label>
            <Textarea
              id="gas-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5"
              rows={2}
              maxLength={280}
            />
          </div>
          {!refill ? (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={createExpense}
                onChange={(event) => setCreateExpense(event.target.checked)}
                className="size-4 accent-[oklch(0.72_0.17_45)]"
              />
              Lançar também como despesa na categoria <strong>Gás</strong>
            </label>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {refill ? (
            <Button variant="ghost" onClick={handleDelete} disabled={remove.isPending}>
              <Trash2 className="size-4" />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
