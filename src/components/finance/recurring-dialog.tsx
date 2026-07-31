import { useState } from "react";
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
import { PAYMENT_METHODS, isoDate, parseAmount, toCents } from "@/lib/finance";
import { useCategories } from "@/lib/queries";
import { FREQUENCIES, useSaveRecurringRule, type RecurringRule } from "@/lib/recurring";
import { useAccounts } from "@/lib/transactions";
import { sanitizeText } from "@/lib/validation";

export function RecurringDialog({
  open,
  onOpenChange,
  rule,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: RecurringRule | null;
  /** Atalho escolhido pelo usuário (tipo e frequência já preenchidos). */
  preset?: { type?: "expense" | "income"; frequency?: string } | null;
}) {
  const save = useSaveRecurringRule();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const [description, setDescription] = useState(rule?.description ?? "");
  const [amount, setAmount] = useState(rule ? String(rule.amount).replace(".", ",") : "");
  const [type, setType] = useState<"expense" | "income">(
    (rule?.transaction_type as "expense" | "income") ?? preset?.type ?? "expense",
  );
  const [categoryId, setCategoryId] = useState(rule?.category_id ?? "");
  const [accountId, setAccountId] = useState(rule?.account_id ?? "");
  const [paymentMethod, setPaymentMethod] = useState(rule?.payment_method ?? "boleto");
  const [frequency, setFrequency] = useState(rule?.frequency ?? preset?.frequency ?? "monthly");

  const [dayOfMonth, setDayOfMonth] = useState(
    rule?.day_of_month ? String(rule.day_of_month) : "",
  );
  const [startDate, setStartDate] = useState(rule?.start_date ?? isoDate(new Date()));
  const [endDate, setEndDate] = useState(rule?.end_date ?? "");
  const [essential, setEssential] = useState(rule?.is_essential ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const options = (categories ?? []).filter((category) => category.type === type);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const cleanDescription = sanitizeText(description);
    const value = toCents(parseAmount(amount));
    const day = dayOfMonth ? Number(dayOfMonth) : null;

    if (cleanDescription.length < 2) nextErrors.description = "Descreva a recorrência.";
    if (!Number.isFinite(value) || value <= 0) nextErrors.amount = "Informe um valor válido.";
    if (!startDate) nextErrors.startDate = "Informe o início.";
    if (endDate && endDate < startDate) nextErrors.endDate = "O fim deve ser após o início.";
    if (day != null && (day < 1 || day > 31)) nextErrors.day = "Dia entre 1 e 31.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await save.mutateAsync({
        id: rule?.id,
        values: {
          description: cleanDescription,
          amount: value,
          transaction_type: type,
          category_id: categoryId || null,
          account_id: accountId || null,
          payment_method: paymentMethod || null,
          frequency,
          day_of_month: day,
          start_date: startDate,
          end_date: endDate || null,
          is_essential: essential,
        },
      });
      toast.success(rule ? "Recorrência atualizada." : "Recorrência criada.");
      onOpenChange(false);
    } catch (error) {
      console.error("[recorrentes] falha ao salvar", error);
      toast.error("Não foi possível salvar a recorrência.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar recorrência" : "Nova despesa recorrente"}</DialogTitle>
          <DialogDescription>
            Os próximos lançamentos são gerados automaticamente até o fim do mês seguinte, sem
            duplicar o que já existe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <Label htmlFor="rec-description">Descrição</Label>
            <Input
              id="rec-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={140}
              className="mt-1.5"
              placeholder="Ex.: Aluguel"
            />
            {errors.description ? (
              <p className="mt-1 text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="rec-amount">Valor (R$)</Label>
            <Input
              id="rec-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1.5 tabular-nums"
              placeholder="0,00"
            />
            {errors.amount ? <p className="mt-1 text-xs text-destructive">{errors.amount}</p> : null}
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as "expense" | "income")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Frequência</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rec-day">Dia do vencimento</Label>
            <Input
              id="rec-day"
              inputMode="numeric"
              value={dayOfMonth}
              onChange={(event) => setDayOfMonth(event.target.value)}
              maxLength={2}
              className="mt-1.5 tabular-nums"
              placeholder="Ex.: 10"
            />
            {errors.day ? <p className="mt-1 text-xs text-destructive">{errors.day}</p> : null}
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
            <Label htmlFor="rec-start">Início</Label>
            <Input
              id="rec-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1.5"
            />
            {errors.startDate ? (
              <p className="mt-1 text-xs text-destructive">{errors.startDate}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="rec-end">Fim (opcional)</Label>
            <Input
              id="rec-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1.5"
            />
            {errors.endDate ? (
              <p className="mt-1 text-xs text-destructive">{errors.endDate}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <Label>Conta (opcional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sem conta" />
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

          <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
            <Label htmlFor="rec-essential" className="text-sm font-normal">
              Conta essencial
            </Label>
            <Switch id="rec-essential" checked={essential} onCheckedChange={setEssential} />
          </div>

          <DialogFooter className="sm:col-span-2">
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
