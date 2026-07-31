import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS, isoDate, parseAmount, toCents } from "@/lib/finance";
import {
  COMMITMENT_STATUS,
  COMMITMENT_TYPES,
  isOpenAccountType,
  useSaveCommitment,
  type Commitment,
} from "@/lib/commitments";
import { useCategories } from "@/lib/queries";

/** Cadastro/edição de um compromisso: financiamento, fiado, empréstimo, pensão etc. */
export function CommitmentDialog({
  commitment,
  open,
  onOpenChange,
}: {
  commitment: Commitment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveCommitment();
  const { data: categories } = useCategories();

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("financiamento");
  const [creditor, setCreditor] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [total, setTotal] = useState("");
  const [installments, setInstallments] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [startDate, setStartDate] = useState(isoDate(new Date()));
  const [dueDay, setDueDay] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [status, setStatus] = useState("open");
  const [openAccount, setOpenAccount] = useState(false);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (commitment) {
      setName(commitment.name);
      setType(commitment.commitment_type);
      setCreditor(commitment.creditor ?? "");
      setCategoryId(commitment.category_id ?? "none");
      setTotal(String(commitment.total_amount ?? "").replace(".", ","));
      setInstallments(commitment.installments_total ? String(commitment.installments_total) : "");
      setInstallmentAmount(
        commitment.installment_amount ? String(commitment.installment_amount).replace(".", ",") : "",
      );
      setInterest(commitment.interest_rate ? String(commitment.interest_rate).replace(".", ",") : "");
      setStartDate(commitment.start_date);
      setDueDay(commitment.due_day ? String(commitment.due_day) : "");
      setNextDue(commitment.next_due_date ?? "");
      setPaymentMethod(commitment.payment_method ?? "pix");
      setStatus(commitment.status);
      setOpenAccount(commitment.is_open_account);
      setContact(commitment.contact ?? "");
      setNotes(commitment.notes ?? "");
      return;
    }
    setName("");
    setType("financiamento");
    setCreditor("");
    setCategoryId("none");
    setTotal("");
    setInstallments("");
    setInstallmentAmount("");
    setInterest("");
    setStartDate(isoDate(new Date()));
    setDueDay("");
    setNextDue("");
    setPaymentMethod("pix");
    setStatus("open");
    setOpenAccount(false);
    setContact("");
    setNotes("");
  }, [open, commitment]);

  const suggestsOpenAccount = isOpenAccountType(type);
  const isOpenAccount = openAccount || suggestsOpenAccount;

  const suggestedInstallment = useMemo(() => {
    const count = Number(installments || 0);
    const totalValue = parseAmount(total || "0");
    if (!count || !Number.isFinite(totalValue) || totalValue <= 0) return 0;
    const rate = parseAmount(interest || "0");
    return priceInstallment(totalValue, count, Number.isFinite(rate) ? rate : 0);
  }, [installments, total, interest]);

  function applySuggestedInstallment() {
    if (suggestedInstallment <= 0) {
      setError("Informe o valor total e o número de parcelas para calcular.");
      return;
    }
    setInstallmentAmount(suggestedInstallment.toFixed(2).replace(".", ","));
  }

  /** Prévia do carnê montado automaticamente (1ª parcela, última e total). */
  const schedulePreview = useMemo(() => {
    const count = Number(installments || 0);
    if (!count || isOpenAccount) return null;
    const declared = parseAmount(installmentAmount || "0");
    const amount = declared > 0 ? toCents(declared) : suggestedInstallment;
    if (amount <= 0) return null;
    const day = dueDay ? Math.min(Math.max(Number(dueDay), 1), 31) : null;
    const first = nextDue || (day ? addMonths(startDate, 1, day) : addMonths(startDate, 1));
    const last = addMonths(first, count - 1, day);
    return { count, amount, first, last, total: toCents(amount * count) };
  }, [installments, installmentAmount, suggestedInstallment, dueDay, nextDue, startDate, isOpenAccount]);


  async function handleSave() {
    if (!name.trim()) {
      setError("Informe um nome para o compromisso.");
      return;
    }
    const totalValue = toCents(parseAmount(total || "0"));
    if (!isOpenAccount && totalValue <= 0) {
      setError("Informe o valor total contratado.");
      return;
    }

    try {
      await save.mutateAsync({
        id: commitment?.id,
        values: {
          name: name.trim().slice(0, 120),
          commitment_type: type,
          creditor: creditor.trim() ? creditor.trim().slice(0, 120) : null,
          category_id: categoryId === "none" ? null : categoryId,
          total_amount: totalValue,
          installments_total: installments ? Number(installments) : null,
          installment_amount: installmentAmount ? toCents(parseAmount(installmentAmount)) : null,
          interest_rate: interest ? parseAmount(interest) : null,
          start_date: startDate,
          due_day: dueDay ? Math.min(Math.max(Number(dueDay), 1), 31) : null,
          next_due_date: nextDue || null,
          payment_method: paymentMethod,
          status,
          is_open_account: isOpenAccount,
          contact: contact.trim() ? contact.trim().slice(0, 120) : null,
          notes: notes.trim() ? notes.trim().slice(0, 500) : null,
        },
      });
      toast.success(commitment ? "Compromisso atualizado." : "Compromisso cadastrado.");
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
          <DialogTitle>{commitment ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          <DialogDescription>
            Financiamentos, fiado no comércio, açougue, empréstimos, cartão de crédito, compras a
            prazo, pensão alimentícia e outras saídas com controle próprio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cm-name">Nome do compromisso</Label>
            <Input
              id="cm-name"
              value={name}
              maxLength={120}
              placeholder="Ex.: Financiamento da moto / Fiado Mercadinho São José"
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="cm-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="cm-type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMITMENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cm-creditor">Credor / estabelecimento</Label>
            <Input
              id="cm-creditor"
              value={creditor}
              maxLength={120}
              placeholder="Ex.: Banco, açougue, loja, pessoa"
              onChange={(event) => setCreditor(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="cm-total">
              {isOpenAccount ? "Saldo inicial devido (R$)" : "Valor total contratado (R$)"}
            </Label>
            <Input
              id="cm-total"
              value={total}
              inputMode="decimal"
              onChange={(event) => setTotal(event.target.value)}
              className="mt-1.5 tabular-nums"
            />
          </div>

          <div>
            <Label htmlFor="cm-category">Categoria do gasto</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="cm-category" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {(categories ?? [])
                  .filter((category) => category.type === "expense")
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {!isOpenAccount ? (
            <>
              <div>
                <Label htmlFor="cm-installments">Nº de parcelas</Label>
                <Input
                  id="cm-installments"
                  value={installments}
                  inputMode="numeric"
                  onChange={(event) => setInstallments(event.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 tabular-nums"
                />
              </div>
              <div>
                <Label htmlFor="cm-installment-amount">Valor da parcela (R$)</Label>
                <Input
                  id="cm-installment-amount"
                  value={installmentAmount}
                  inputMode="decimal"
                  onChange={(event) => setInstallmentAmount(event.target.value)}
                  className="mt-1.5 tabular-nums"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-2.5 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium">Parcelamento automático</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={applySuggestedInstallment}
                  >
                    Calcular parcela
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {schedulePreview
                    ? `${schedulePreview.count}x de ${formatCurrency(schedulePreview.amount)} · 1ª em ${formatDate(`${schedulePreview.first}T12:00:00`)} · última em ${formatDate(`${schedulePreview.last}T12:00:00`)} · total ${formatCurrency(schedulePreview.total)}`
                    : "Informe o valor total e o número de parcelas para o sistema montar os vencimentos mês a mês."}
                </p>
              </div>
            </>
          ) : null}


          <div>
            <Label htmlFor="cm-interest">Juros / encargos (% a.m.)</Label>
            <Input
              id="cm-interest"
              value={interest}
              inputMode="decimal"
              onChange={(event) => setInterest(event.target.value)}
              className="mt-1.5 tabular-nums"
            />
          </div>

          <div>
            <Label htmlFor="cm-start">Início</Label>
            <Input
              id="cm-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="cm-dueday">Dia do vencimento</Label>
            <Input
              id="cm-dueday"
              value={dueDay}
              inputMode="numeric"
              placeholder="Ex.: 10"
              onChange={(event) => setDueDay(event.target.value.replace(/\D/g, "").slice(0, 2))}
              className="mt-1.5 tabular-nums"
            />
          </div>

          <div>
            <Label htmlFor="cm-nextdue">Próximo vencimento (opcional)</Label>
            <Input
              id="cm-nextdue"
              type="date"
              value={nextDue}
              onChange={(event) => setNextDue(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="cm-payment">Forma de pagamento habitual</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="cm-payment" className="mt-1.5">
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
            <Label htmlFor="cm-status">Situação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="cm-status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMITMENT_STATUS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cm-contact">Contato do credor</Label>
            <Input
              id="cm-contact"
              value={contact}
              maxLength={120}
              placeholder="Telefone ou responsável"
              onChange={(event) => setContact(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Conta aberta (fiado / cartão)</p>
              <p className="text-[11px] text-muted-foreground">
                O saldo devedor é a soma das compras lançadas menos os pagamentos, sem parcela fixa.
              </p>
            </div>
            <Switch
              checked={isOpenAccount}
              disabled={suggestsOpenAccount}
              onCheckedChange={setOpenAccount}
              aria-label="Conta aberta"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="cm-notes">Observações</Label>
            <Textarea
              id="cm-notes"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5"
              placeholder="Ex.: acordo de pensão homologado, contrato nº, combinado de pagamento."
            />
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            Salvar compromisso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
