import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  EXPENSE_TYPES,
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  isoDate,
  parseAmount,
  toCents,
} from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import {
  useAccounts,
  useDeleteTransaction,
  useRestoreTransaction,
  useSaveTransaction,
  type Transaction,
} from "@/lib/transactions";
import { sanitizeText } from "@/lib/validation";

type Kind = "expense" | "income";

export function TransactionDialog({
  open,
  onOpenChange,
  kind = "expense",
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: Kind;
  transaction?: Transaction | null;
}) {
  const editing = Boolean(transaction);
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const restore = useRestoreTransaction();

  const options = useMemo(
    () => (categories ?? []).filter((category) => category.type === kind),
    [categories, kind],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(false);

  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount).replace(".", ",") : "",
  );
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(transaction?.transaction_date ?? isoDate(new Date()));
  const [time, setTime] = useState(transaction?.transaction_time ?? "");
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method ?? "pix");
  const [expenseType, setExpenseType] = useState(transaction?.expense_type ?? "variavel");
  const [accountId, setAccountId] = useState(transaction?.account_id ?? "");
  const [merchant, setMerchant] = useState(transaction?.merchant_name ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [tags, setTags] = useState((transaction?.tags ?? []).join(", "));
  const [essential, setEssential] = useState(transaction?.is_essential ?? false);
  const [status, setStatus] = useState<string>(transaction?.status ?? (kind === "income" ? "received" : "paid"));
  const [recurring, setRecurring] = useState(transaction?.is_recurring ?? false);
  const [installments, setInstallments] = useState(
    transaction?.total_installments ? String(transaction.total_installments) : "",
  );
  const [dueDate, setDueDate] = useState(transaction?.due_date ?? "");

  function reset() {
    setDescription("");
    setAmount("");
    setCategoryId("");
    setDate(isoDate(new Date()));
    setTime("");
    setMerchant("");
    setNotes("");
    setTags("");
    setInstallments("");
    setDueDate("");
    setErrors({});
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const cleanDescription = sanitizeText(description);
    const value = toCents(parseAmount(amount));

    if (cleanDescription.length < 2) nextErrors.description = "Descreva o lançamento.";
    if (cleanDescription.length > 140) nextErrors.description = "Descrição muito longa.";
    if (!Number.isFinite(value) || value <= 0) nextErrors.amount = "Informe um valor maior que zero.";
    if (value > 100_000_000) nextErrors.amount = "Valor muito alto.";
    if (!date) nextErrors.date = "Informe a data.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const total = installments ? Number(installments) : null;

    try {
      const saved = await save.mutateAsync({
        id: transaction?.id,
        values: {
          description: cleanDescription,
          amount: value,
          transaction_type: kind,
          category_id: categoryId || null,
          account_id: accountId || null,
          transaction_date: date,
          transaction_time: time || null,
          payment_method: paymentMethod || null,
          expense_type: kind === "expense" ? expenseType : null,
          merchant_name: merchant ? sanitizeText(merchant) : null,
          notes: notes ? sanitizeText(notes) : null,
          tags: tags
            .split(",")
            .map((tag) => sanitizeText(tag))
            .filter(Boolean)
            .slice(0, 10),
          is_essential: essential,
          is_recurring: recurring,
          total_installments: total && total > 1 ? total : null,
          installment_number: total && total > 1 ? 1 : null,
          due_date: dueDate || null,
          status: status as Transaction["status"],
        },
      });

      onOpenChange(false);
      reset();

      if (editing) {
        toast.success("Lançamento atualizado.");
        return;
      }

      toast.success("Lançamento salvo!", {
        description: cleanDescription,
        action: {
          label: "Desfazer",
          onClick: async () => {
            await remove.mutateAsync([saved.id]);
            toast("Lançamento desfeito.", {
              action: {
                label: "Refazer",
                onClick: () => restore.mutate([saved.id]),
              },
            });
          },
        },
        duration: 8000,
      });
    } catch (error) {
      console.error("[transacoes] falha ao salvar", error);
      toast.error("Não foi possível salvar o lançamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar lançamento" : kind === "income" ? "Nova receita" : "Novo gasto"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos essenciais ou abra o cadastro avançado para mais detalhes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Tabs
            value={advanced ? "avancado" : "rapido"}
            onValueChange={(value) => setAdvanced(value === "avancado")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rapido">Cadastro rápido</TabsTrigger>
              <TabsTrigger value="avancado">Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="rapido" className="mt-4 space-y-4" />
            <TabsContent value="avancado" className="mt-4 space-y-4" />
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={140}
                className="mt-1.5"
                placeholder="Ex.: Mercado do bairro"
              />
              {errors.description ? (
                <p className="mt-1 text-xs text-destructive">{errors.description}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                className="mt-1.5 tabular-nums"
                placeholder="0,00"
              />
              {errors.amount ? (
                <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1.5"
              />
              {errors.date ? <p className="mt-1 text-xs text-destructive">{errors.date}</p> : null}
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
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

            {advanced ? (
              <>
                <div>
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time ?? ""}
                    onChange={(event) => setTime(event.target.value)}
                    className="mt-1.5"
                  />
                </div>

                {kind === "expense" ? (
                  <div>
                    <Label>Tipo de despesa</Label>
                    <Select value={expenseType} onValueChange={setExpenseType}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div>
                  <Label>Conta ou carteira</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Situação</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_STATUS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="merchant">Estabelecimento</Label>
                  <Input
                    id="merchant"
                    value={merchant}
                    onChange={(event) => setMerchant(event.target.value)}
                    maxLength={100}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="dueDate">Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="installments">Parcelas</Label>
                  <Input
                    id="installments"
                    type="number"
                    min={1}
                    max={99}
                    value={installments}
                    onChange={(event) => setInstallments(event.target.value)}
                    className="mt-1.5"
                    placeholder="À vista"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    className="mt-1.5"
                    placeholder="casa, urgente"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={500}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
                  <Label htmlFor="essential" className="text-sm font-normal">
                    Despesa essencial
                  </Label>
                  <Switch id="essential" checked={essential} onCheckedChange={setEssential} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
                  <Label htmlFor="recurring" className="text-sm font-normal">
                    Lançamento recorrente
                  </Label>
                  <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
