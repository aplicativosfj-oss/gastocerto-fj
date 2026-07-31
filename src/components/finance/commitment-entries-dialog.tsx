import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, isoDate, labelFor, parseAmount, toCents } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ENTRY_TYPES,
  useDeleteCommitmentEntry,
  useSaveCommitmentEntry,
  type CommitmentSummary,
} from "@/lib/commitments";

/** Lançar pagamentos e novas compras/cobranças de um compromisso. */
export function CommitmentEntriesDialog({
  summary,
  open,
  onOpenChange,
}: {
  summary: CommitmentSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveCommitmentEntry();
  const remove = useDeleteCommitmentEntry();

  const [entryType, setEntryType] = useState("payment");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(isoDate(new Date()));
  const [installment, setInstallment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !summary) return;
    setEntryType("payment");
    setAmount(
      summary.commitment.installment_amount
        ? String(summary.commitment.installment_amount).replace(".", ",")
        : "",
    );
    setEntryDate(isoDate(new Date()));
    setInstallment(String(summary.paidInstallments + 1));
    setPaymentMethod(summary.commitment.payment_method ?? "pix");
    setDescription("");
    setError("");
  }, [open, summary]);

  async function handleAdd() {
    if (!summary) return;
    const value = toCents(parseAmount(amount || "0"));
    if (value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          commitment_id: summary.commitment.id,
          entry_type: entryType,
          amount: value,
          entry_date: entryDate,
          installment_number: installment ? Number(installment) : null,
          payment_method: paymentMethod,
          description: description.trim() ? description.trim().slice(0, 160) : null,
        },
      });
      setAmount("");
      setDescription("");
      setError("");
      toast.success("Movimento lançado.");
    } catch (saveError) {
      toast.error("Não foi possível lançar.", {
        description: saveError instanceof Error ? saveError.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{summary?.commitment.name ?? "Compromisso"}</DialogTitle>
          <DialogDescription>
            Lance pagamentos, novas compras (fiado), juros ou descontos e acompanhe o saldo devedor.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="Total" value={summary.contracted} />
              <Stat label="Pago" value={summary.paid} tone="ok" />
              <Stat label="Saldo devedor" value={summary.outstanding} tone="alert" strong />
              <div>
                <p className="text-[11px] text-muted-foreground">Vencimento</p>
                <p className="text-sm">
                  {summary.nextDue ? formatDate(summary.nextDue) : "—"}
                  {summary.overdue ? (
                    <Badge variant="destructive" className="ml-1.5 text-[10px]">
                      atrasado
                    </Badge>
                  ) : null}
                </p>
              </div>
            </div>
            <Progress value={summary.progress} className="mt-2 h-1.5" />
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ce-type">Tipo de movimento</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger id="ce-type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ce-amount">Valor (R$)</Label>
            <Input
              id="ce-amount"
              value={amount}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1.5 tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="ce-date">Data</Label>
            <Input
              id="ce-date"
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ce-installment">Parcela nº (opcional)</Label>
            <Input
              id="ce-installment"
              value={installment}
              inputMode="numeric"
              onChange={(event) => setInstallment(event.target.value.replace(/\D/g, ""))}
              className="mt-1.5 tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="ce-payment">Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="ce-payment" className="mt-1.5">
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
          <div>
            <Label htmlFor="ce-description">Descrição</Label>
            <Input
              id="ce-description"
              value={description}
              maxLength={160}
              placeholder="Ex.: 2 kg de carne, parcela de outubro"
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <Button onClick={handleAdd} disabled={save.isPending} className="w-full sm:w-auto">
          Lançar movimento
        </Button>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Movimentos lançados</p>
          {!summary || summary.entries.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Nenhum movimento ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border/70">
              {summary.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {labelFor(ENTRY_TYPES, entry.entry_type)}
                      {entry.description ? ` — ${entry.description}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(entry.entry_date)}
                      {entry.installment_number ? ` · parcela ${entry.installment_number}` : ""}
                      {entry.payment_method
                        ? ` · ${labelFor(PAYMENT_METHODS, entry.payment_method)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        entry.entry_type === "payment" || entry.entry_type === "discount"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {formatCurrency(Number(entry.amount))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Excluir movimento"
                      onClick={async () => {
                        try {
                          await remove.mutateAsync(entry.id);
                          toast.success("Movimento removido.");
                        } catch {
                          toast.error("Não foi possível remover.");
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone?: "ok" | "alert";
  strong?: boolean;
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "alert"
        ? "text-destructive"
        : "";
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${strong ? "font-semibold" : ""} ${toneClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
