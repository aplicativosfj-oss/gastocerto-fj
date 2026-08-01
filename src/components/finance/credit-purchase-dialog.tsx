import { useMemo, useState } from "react";
import { CreditCard, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { CREDIT_TAG, creditNote } from "@/lib/credit-purchases";
import { isoDate } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useAccounts, useSaveTransaction } from "@/lib/transactions";

type Row = { key: string; date: string; credits: string; total: string };

function newRow(): Row {
  return { key: crypto.randomUUID(), date: isoDate(new Date()), credits: "", total: "" };
}

function parseMoney(masked: string) {
  return Number(masked.replace(/\./g, "").replace(",", ".")) || 0;
}

/**
 * Lançamento em lote de compras de créditos (ex.: créditos do Lovable):
 * várias datas, quantidades e valores de uma vez, sempre no cartão escolhido.
 */
export function CreditPurchaseDialog({
  open,
  onOpenChange,
  defaultProvider = "Lovable",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProvider?: string;
}) {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const save = useSaveTransaction();

  const [provider, setProvider] = useState(defaultProvider);
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([newRow()]);

  const cards = useMemo(
    () => (accounts ?? []).filter((account) => account.account_type === "credit_card"),
    [accounts],
  );

  const expenseCategories = useMemo(
    () => (categories ?? []).filter((category) => category.type === "expense"),
    [categories],
  );

  const appsCategory = useMemo(
    () =>
      expenseCategories.find((category) =>
        category.name.toLowerCase().startsWith("aplicativos"),
      ) ?? expenseCategories[0],
    [expenseCategories],
  );

  const effectiveCategory = categoryId || appsCategory?.id || "";
  const effectiveAccount = accountId || cards[0]?.id || "";

  const parsed = useMemo(
    () =>
      rows.map((row) => {
        const credits = Number(row.credits.replace(",", ".")) || 0;
        const total = parseMoney(row.total);
        return {
          ...row,
          credits,
          total,
          unit: credits > 0 ? total / credits : 0,
          valid: Boolean(row.date) && total > 0,
        };
      }),
    [rows],
  );

  const valids = parsed.filter((row) => row.valid);
  const totalAmount = valids.reduce((sum, row) => sum + row.total, 0);
  const totalCredits = valids.reduce((sum, row) => sum + row.credits, 0);
  const averageUnit = totalCredits > 0 ? totalAmount / totalCredits : 0;

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const reset = () => {
    setRows([newRow()]);
    setProvider(defaultProvider);
  };

  async function handleSave() {
    if (valids.length === 0) {
      toast.error("Informe pelo menos uma data e um valor.");
      return;
    }
    try {
      for (const row of valids) {
        await save.mutateAsync({
          values: {
            description: `${provider.trim() || "Créditos"} — ${
              row.credits > 0 ? `${row.credits} créditos` : "compra de créditos"
            }`.slice(0, 140),
            amount: row.total,
            transaction_type: "expense",
            category_id: effectiveCategory || null,
            account_id: effectiveAccount || null,
            payment_method: "credit_card",
            transaction_date: row.date,
            status: "paid",
            payment_date: row.date,
            notes: creditNote(row.credits, row.total),
            tags: [CREDIT_TAG],
          },
        });
      }
      toast.success(
        `${valids.length} compra(s) de créditos lançada(s) — ${formatCurrency(totalAmount)}.`,
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível lançar as compras.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Compras de créditos em lote
          </DialogTitle>
          <DialogDescription>
            Informe várias datas e valores de uma vez. O sistema calcula o preço por crédito e
            lança tudo no cartão escolhido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="credit-provider">Serviço / plataforma</Label>
              <Input
                id="credit-provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                placeholder="Ex.: Lovable"
                maxLength={60}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Cartão de crédito</Label>
              <Select value={effectiveAccount} onValueChange={setAccountId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      Cadastre um cartão em Cadastros.
                    </p>
                  ) : (
                    cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={effectiveCategory} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {parsed.map((row, index) => (
              <div
                key={row.key}
                className="grid items-end gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label htmlFor={`credit-date-${row.key}`} className="text-xs">
                    Data
                  </Label>
                  <Input
                    id={`credit-date-${row.key}`}
                    type="date"
                    value={row.date}
                    onChange={(event) => update(row.key, { date: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`credit-qty-${row.key}`} className="text-xs">
                    Créditos
                  </Label>
                  <Input
                    id={`credit-qty-${row.key}`}
                    inputMode="numeric"
                    value={rows[index]?.credits ?? ""}
                    onChange={(event) =>
                      update(row.key, { credits: event.target.value.replace(/[^\d]/g, "") })
                    }
                    placeholder="20"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`credit-total-${row.key}`} className="text-xs">
                    Total pago
                  </Label>
                  <MoneyInput
                    id={`credit-total-${row.key}`}
                    value={rows[index]?.total ?? ""}
                    onValueChange={(masked) => update(row.key, { total: masked })}
                    placeholder="26,41"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {row.unit > 0 ? `${formatCurrency(row.unit)}/créd.` : "—"}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remover linha"
                    disabled={rows.length === 1}
                    onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((current) => [...current, newRow()])}
            >
              <Plus className="mr-2 size-4" aria-hidden />
              Adicionar outra compra
            </Button>
          </div>

          <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Compras</p>
              <p className="font-semibold tabular-nums">{valids.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Créditos · preço médio</p>
              <p className="font-semibold tabular-nums">
                {totalCredits} · {averageUnit > 0 ? formatCurrency(averageUnit) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total gasto</p>
              <p className="font-semibold tabular-nums">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <Button type="button" className="w-full" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="mr-2 size-4" aria-hidden />
            )}
            Lançar {valids.length > 0 ? `${valids.length} compra(s)` : "compras"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
