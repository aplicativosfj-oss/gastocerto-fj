import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryPicker, readRecentCategories, rememberCategory } from "@/components/finance/category-picker";
import { PurchaseItemsEditor } from "@/components/finance/purchase-items-editor";
import { ReceiptField } from "@/components/finance/receipt-field";

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

import {
  EXPENSE_TYPES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  isoDate,
  parseAmount,
  toCents,
} from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { amountToInput, maskAmountInput } from "@/lib/money-input";
import { upperText } from "@/lib/text-case";

import { useCategories } from "@/lib/queries";
import {
  itemFromRow,
  useSaveTransactionItems,
  useTransactionItems,
  validatePurchaseItems,
  type ItemDraft,
} from "@/lib/purchase-items";
import {
  useAccounts,
  useDeleteTransaction,
  useLastTransaction,
  useRestoreTransaction,
  useSaveCategoryFeedback,
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
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: Kind;
  transaction?: Transaction | null;
  /** Data inicial sugerida (permite lançar em meses anteriores). */
  defaultDate?: string;
  onSaved?: (date: string) => void;
}) {
  const editing = Boolean(transaction);
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const restore = useRestoreTransaction();
  const saveItems = useSaveTransactionItems();
  const { data: existingItems } = useTransactionItems(open ? transaction?.id : null);
  const [items, setItems] = useState<ItemDraft[]>([]);

  const options = useMemo(
    () => (categories ?? []).filter((category) => category.type === kind),
    [categories, kind],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(false);

  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(amountToInput(transaction?.amount));

  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(
    transaction?.transaction_date ?? defaultDate ?? isoDate(new Date()),
  );
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
  const [attachment, setAttachment] = useState<string | null>(transaction?.attachment_url ?? null);
  const [suggestion, setSuggestion] = useState<{ id: string; name: string; subCategoryId?: string | null } | null>(null);
  const [subCategoryId, setSubCategoryId] = useState((transaction as any)?.sub_category_id ?? "");
  const saveFeedback = useSaveCategoryFeedback();

  const { data: lastTransaction } = useLastTransaction(kind);


  /** Sugestão automática baseada na descrição */
  useEffect(() => {
    if (!description || editing || categoryId) return;
    const clean = description.trim().toLowerCase();
    if (clean.length < 3) return;

    // Busca simples nas categorias existentes por nome
    const match = options.find(cat => 
      cat.name.toLowerCase().includes(clean) || 
      clean.includes(cat.name.toLowerCase())
    );
    
    if (match) {
      if (match.parent_id) {
        setCategoryId(match.parent_id);
        setSubCategoryId(match.id);
      } else {
        setCategoryId(match.id);
        setSubCategoryId("");
      }
      setSuggestion({ id: match.id, name: match.name });
    } else {
      setSuggestion(null);
    }

  }, [description, options, editing, categoryId]);

  /**
   * Ao abrir um novo lançamento, herda categoria/forma de pagamento/conta do
   * último registro do mesmo tipo.
   */
  useEffect(() => {
    if (!open || editing || !lastTransaction) return;
    setSuggestion(null);
    setCategoryId((current) => {
      if (current) return current;
      const recent = readRecentCategories().find((id) =>
        options.some((option) => option.id === id),
      );
      
      const lastCat = lastTransaction.category_id;
      const lastSub = (lastTransaction as any).sub_category_id;
      
      if (lastSub) {
        setSubCategoryId(lastSub);
      }
      
      return recent ?? lastCat ?? "";
    });
    setPaymentMethod((current) => current || lastTransaction.payment_method || "pix");
    setAccountId((current) => current || lastTransaction.account_id || "");
    if (kind === "expense") {
      setExpenseType((current) => current || lastTransaction.expense_type || "variavel");
      setEssential((current) => current || Boolean(lastTransaction.is_essential));
    }
  }, [open, editing, lastTransaction, kind, options]);

  /** Carrega os itens detalhados quando abre um lançamento existente. */
  useEffect(() => {
    if (!open) return;
    if (!transaction?.id) {
      setItems([]);
      return;
    }
    setItems((existingItems ?? []).map(itemFromRow));
  }, [open, transaction?.id, existingItems]);


  const isPastMonth = date.slice(0, 7) < isoDate(new Date()).slice(0, 7);

  function shiftDate(kindOfShift: "today" | "yesterday" | "lastMonth") {
    const base = new Date();
    if (kindOfShift === "yesterday") base.setDate(base.getDate() - 1);
    if (kindOfShift === "lastMonth") base.setMonth(base.getMonth() - 1);
    setDate(isoDate(base));
  }

  /** Ctrl/Cmd + Enter salva; Alt + C abre o seletor de categoria. */
  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement | null;
    const isTextarea = target?.tagName === "TEXTAREA";

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
      return;
    }

    if (event.key === "Enter" && !isTextarea && target?.tagName === "INPUT") {
      event.preventDefault();
      const fields = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          "input:not([type=hidden]), button[data-category-trigger], textarea",
        ),
      );
      const index = fields.indexOf(target);
      const next = fields[index + 1];
      if (next) next.focus();
      else event.currentTarget.requestSubmit();
      return;
    }

    if (event.altKey && (event.key === "c" || event.key === "C")) {
      event.preventDefault();
      event.currentTarget
        .querySelector<HTMLButtonElement>("button[data-category-trigger]")
        ?.click();
    }
  }





  function reset() {
    setDescription("");
    setAmount("");
    setCategoryId("");
    setSubCategoryId("");
    setDate(defaultDate ?? isoDate(new Date()));
    setTime("");
    setMerchant("");
    setNotes("");
    setTags("");
    setInstallments("");
    setDueDate("");
    setAttachment(null);
    setErrors({});
    setSuggestion(null);
    setItems([]);


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

    const itemsCheck = validatePurchaseItems(items, value);
    if (itemsCheck.issues.length > 0) {
      nextErrors.items = "Corrija os itens destacados da compra.";
    } else if (itemsCheck.totalMismatch) {
      nextErrors.items = `A soma dos itens (${itemsCheck.total
        .toFixed(2)
        .replace(".", ",")}) não bate com o valor do gasto. Diferença de ${Math.abs(itemsCheck.diff)
        .toFixed(2)
        .replace(".", ",")}.`;
    }

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
          sub_category_id: subCategoryId || null,
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
          attachment_url: attachment,
          status: status as Transaction["status"],

        },
      });

      const filledItems = items.filter((item) => item.name.trim().length > 0);
      if (saved?.id && (filledItems.length > 0 || (existingItems ?? []).length > 0)) {
        await saveItems.mutateAsync({ transactionId: saved.id, items: filledItems });
      }

      if (categoryId) rememberCategory(categoryId);
      const savedDate = date;
      onOpenChange(false);
      reset();
      onSaved?.(savedDate);

      if (editing) {
        toast.success("Lançamento atualizado.", {
          description: isPastMonth ? `Registrado em ${formatDate(savedDate)}.` : undefined,
        });
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
            {kind === "income"
              ? "Registre quanto entrou e de onde veio o dinheiro."
              : "Registre quanto saiu e em que você gastou."}{" "}
            Use “Mais opções” para conta, parcelas e anexos. Atalhos: Enter avança, Ctrl/Cmd +
            Enter salva e Alt + C abre as categorias.
          </DialogDescription>

        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className="space-y-4"
          noValidate
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 ${
              kind === "income"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            <p className="text-xs font-semibold">
              {kind === "income"
                ? "Entrada de dinheiro (receita)"
                : "Saída de dinheiro (despesa)"}
              <span className="ml-1 font-normal text-muted-foreground">
                {kind === "income"
                  ? "— soma ao que você tem para gastar."
                  : "— desconta do seu saldo do mês."}
              </span>
            </p>
            <Button
              type="button"
              variant={advanced ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => setAdvanced((current) => !current)}
            >
              {advanced ? "Ocultar campos extras" : "Mais opções"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="description">
                {kind === "income" ? "Descrição / Fonte da Renda" : "Descrição / Nome do estabelecimento"}
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={140}
                className="mt-1.5"
                placeholder={
                  kind === "income" ? "Ex: Salário Mensal, Venda OLX..." : "Ex: Supermercado Silva, Posto Ipiranga..."
                }
              />
              {errors.description ? (
                <p className="mt-1 text-xs text-destructive">{errors.description}</p>
              ) : null}
            </div>


            <div>
              <Label htmlFor="amount">
                {kind === "income" ? "Valor recebido (R$)" : "Valor do gasto (R$)"}
              </Label>
              <Input
                id="amount"
                value={amount}
                inputMode="numeric"
                onChange={(event) => setAmount(maskAmountInput(event.target.value))}
                className="mt-1.5 text-right tabular-nums"
                placeholder="0,00"
                aria-describedby="amount-help"
              />
              <p id="amount-help" className="mt-1 text-[11px] text-muted-foreground">
                Digite só os números: o ponto de milhar e a vírgula dos centavos são colocados
                automaticamente.
              </p>
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
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => shiftDate("today")}>
                  Hoje
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => shiftDate("yesterday")}
                >
                  Ontem
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => shiftDate("lastMonth")}
                >
                  Mês passado
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isPastMonth
                  ? `Lançamento retroativo: será contabilizado em ${formatDate(date)}.`
                  : "Você pode registrar gastos de dias ou meses anteriores."}
              </p>
              {errors.date ? <p className="mt-1 text-xs text-destructive">{errors.date}</p> : null}
            </div>


            <div>
              <Label>Categoria</Label>
              <CategoryPicker
                categories={options}
                value={subCategoryId || categoryId}
                onChange={(id) => {
                  const selectedCat = options.find(c => c.id === id);
                  if (suggestion && suggestion.id !== id) {
                    saveFeedback.mutate({
                      description: description,
                      suggested_category_id: suggestion.id,
                      accepted: false,
                      corrected_category_id: id
                    });
                  } else if (suggestion && suggestion.id === id) {
                    saveFeedback.mutate({
                      description: description,
                      suggested_category_id: suggestion.id,
                      accepted: true
                    });
                  }
                  
                  if (selectedCat?.parent_id) {
                    setCategoryId(selectedCat.parent_id);
                    setSubCategoryId(id);
                  } else {
                    setCategoryId(id);
                    setSubCategoryId("");
                  }
                  setSuggestion(null);
                }}
                autoFilled={Boolean(suggestion)}
              />
              {suggestion && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/50 p-2 text-[11px]">
                  <span>Sugestão: <strong>{suggestion.name}</strong></span>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        saveFeedback.mutate({
                          description: description,
                          suggested_category_id: suggestion.id,
                          accepted: true
                        });
                        setSuggestion(null);
                      }}
                    >
                      Correspondeu
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setSuggestion(null);
                        setCategoryId("");
                        setSubCategoryId("");
                      }}
                    >
                      Não correspondeu
                    </Button>
                  </div>
                </div>
              )}

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

            <div className="sm:col-span-2">
              <Label htmlFor="merchant">
                {kind === "income" ? "Fonte da renda" : "Estabelecimento / loja"}
              </Label>
              <Input
                id="merchant"
                value={merchant}
                onChange={(event) => setMerchant(upperText(event.target.value))}
                maxLength={100}
                className="mt-1.5"
                placeholder={
                  kind === "income"
                    ? "EX.: SALÁRIO DA PREFEITURA, VENDA DE BOLOS, SERVIÇO DE PINTURA"
                    : "EX.: SUPERMERCADO CENTRAL, FEIRA DO PRODUTOR"
                }
              />
              {kind === "income" ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {INCOME_SOURCES.map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setMerchant(upperText(source))}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {source}
                    </button>
                  ))}
                </div>

              ) : null}
            </div>


            {kind === "expense" ? (
              <div className="sm:col-span-2">
                <PurchaseItemsEditor
                  items={items}
                  onChange={setItems}
                  amount={toCents(parseAmount(amount))}
                  showValidation
                  onApplyTotal={(total) => setAmount(amountToInput(total))}
                />
                {errors.items ? (
                  <p className="mt-1 text-xs text-destructive">{errors.items}</p>
                ) : null}
              </div>
            ) : null}

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
                    onChange={(event) => setTags(upperText(event.target.value))}
                    className="mt-1.5"
                    placeholder="CASA, URGENTE"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(upperText(event.target.value))}

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

            <div className="sm:col-span-2">
              <ReceiptField value={attachment} onChange={setAttachment} />
            </div>
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
