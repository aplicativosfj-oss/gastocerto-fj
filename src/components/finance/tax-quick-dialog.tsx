import { useMemo, useState } from "react";
import { Check, Landmark } from "lucide-react";
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
import { addMonths } from "@/lib/commitment-schedule";
import { isoDate, parseAmount, toCents } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useSaveTransaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

type TaxKind = "pay" | "receive";

const CATEGORY_BY_KIND: Record<TaxKind, { name: string; type: "expense" | "income" }> = {
  pay: { name: "Imposto de Renda a pagar", type: "expense" },
  receive: { name: "Imposto de Renda a receber", type: "income" },
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Fluxo rápido do Imposto de Renda: escolhe se é a pagar ou a receber, o
 * ano-calendário (competência), o exercício e as quotas — o sistema gera os
 * lançamentos já com a competência registrada.
 */
export function TaxQuickDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: categories } = useCategories();
  const save = useSaveTransaction();

  const now = new Date();
  const [kind, setKind] = useState<TaxKind>("pay");
  const [amount, setAmount] = useState("");
  const [calendarYear, setCalendarYear] = useState(String(now.getFullYear() - 1));
  const [quotas, setQuotas] = useState("1");
  const [firstDue, setFirstDue] = useState(isoDate(now));
  const [alreadySettled, setAlreadySettled] = useState(false);
  const [note, setNote] = useState("");

  const exerciseYear = Number(calendarYear) + 1;
  const value = amount ? parseAmount(amount) : 0;
  const quotaCount = kind === "pay" ? Math.min(Math.max(Number(quotas) || 1, 1), 8) : 1;

  const category = useMemo(() => {
    const target = CATEGORY_BY_KIND[kind];
    const list = (categories ?? []).filter((item) => item.type === target.type);
    return list.find((item) => item.name === target.name) ?? null;
  }, [categories, kind]);

  /** Quotas geradas com os dados atuais. */
  const plan = useMemo(() => {
    if (value <= 0) return [];
    const cents = Math.round(value * 100);
    const base = Math.floor(cents / quotaCount);
    return Array.from({ length: quotaCount }, (_, index) => ({
      number: index + 1,
      dueDate: addMonths(firstDue, index),
      amount: toCents((index === quotaCount - 1 ? cents - base * (quotaCount - 1) : base) / 100),
    }));
  }, [value, quotaCount, firstDue]);

  const competence = `${MONTHS[0]}/${calendarYear}`;

  function reset() {
    setKind("pay");
    setAmount("");
    setCalendarYear(String(new Date().getFullYear() - 1));
    setQuotas("1");
    setFirstDue(isoDate(new Date()));
    setAlreadySettled(false);
    setNote("");
  }

  async function handleSave() {
    if (value <= 0) {
      toast.error("Informe o valor do imposto.");
      return;
    }
    if (!category) {
      toast.error(`Categoria "${CATEGORY_BY_KIND[kind].name}" não encontrada.`);
      return;
    }
    const label = kind === "pay" ? "IR a pagar" : "IR a receber (restituição)";
    try {
      for (const item of plan) {
        const suffix = quotaCount > 1 ? ` — quota ${item.number}/${quotaCount}` : "";
        await save.mutateAsync({
          values: {
            description: `${label} ${calendarYear}${suffix}${note.trim() ? ` · ${note.trim()}` : ""}`.slice(
              0,
              140,
            ),
            amount: item.amount,
            transaction_type: kind === "pay" ? "expense" : "income",
            category_id: category.id,
            transaction_date: item.dueDate,
            due_date: item.dueDate,
            status: alreadySettled ? (kind === "pay" ? "paid" : "received") : "pending",
            payment_date: alreadySettled ? item.dueDate : null,
            installment_number: quotaCount > 1 ? item.number : null,
            total_installments: quotaCount > 1 ? quotaCount : null,
            tags: [`ir:${calendarYear}`, `exercicio:${exerciseYear}`],
            notes: `Imposto de Renda — ano-calendário ${calendarYear}, exercício ${exerciseYear} (competência ${competence}).`,
          },
        });
      }
      toast.success(
        quotaCount > 1
          ? `${quotaCount} quotas do IR ${calendarYear} lançadas.`
          : `${label} de ${formatCurrency(value)} lançado.`,
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível lançar o imposto.", {
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-4" aria-hidden />
            Imposto de Renda
          </DialogTitle>
          <DialogDescription>
            Lance o IR a pagar (em quotas) ou a restituição a receber, com o ano-calendário e o
            exercício certos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "pay" as TaxKind, label: "IR a pagar", hint: "Sai do seu bolso" },
                { value: "receive" as TaxKind, label: "IR a receber", hint: "Restituição" },
              ]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  kind === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="ir-amount">
                {kind === "pay" ? "Valor total a pagar" : "Valor da restituição"}
              </Label>
              <MoneyInput
                id="ir-amount"
                value={amount}
                onValueChange={setAmount}
                placeholder="0,00"
                className="mt-1 text-lg font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="ir-year">Ano-calendário (competência)</Label>
              <Input
                id="ir-year"
                inputMode="numeric"
                value={calendarYear}
                onChange={(event) =>
                  setCalendarYear(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="mt-1 tabular-nums"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Exercício {Number.isFinite(exerciseYear) ? exerciseYear : "—"} (ano da declaração).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {kind === "pay" ? (
              <div>
                <Label htmlFor="ir-quotas">Quotas (1 a 8)</Label>
                <Input
                  id="ir-quotas"
                  inputMode="numeric"
                  value={quotas}
                  onChange={(event) => setQuotas(event.target.value.replace(/\D/g, "").slice(0, 1))}
                  className="mt-1 tabular-nums"
                />
              </div>
            ) : null}
            <div>
              <Label htmlFor="ir-due">
                {kind === "pay" ? "Vencimento da 1ª quota" : "Data prevista do crédito"}
              </Label>
              <Input
                id="ir-due"
                type="date"
                value={firstDue}
                onChange={(event) => setFirstDue(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={alreadySettled}
              onChange={(event) => setAlreadySettled(event.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            {kind === "pay" ? "Já paguei este valor" : "Já recebi este valor"}
          </label>

          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={80}
            placeholder="Observação (opcional) — ex.: declaração completa"
          />

          {plan.length > 0 ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {kind === "pay" ? "Quotas que serão lançadas" : "Lançamento que será criado"}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {plan.map((item) => (
                  <li key={item.number} className="flex items-center justify-between gap-2">
                    <span>
                      {quotaCount > 1 ? `Quota ${item.number}/${quotaCount} · ` : ""}
                      {formatDate(`${item.dueDate}T12:00:00`)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Competência: ano-calendário {calendarYear} · exercício {exerciseYear} ·
                {" "}
                {category ? category.name : "categoria não encontrada"}
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={save.isPending || value <= 0}
            onClick={handleSave}
          >
            <Check className="size-4" aria-hidden />
            {kind === "pay"
              ? quotaCount > 1
                ? `Lançar ${quotaCount} quotas`
                : "Lançar IR a pagar"
              : "Lançar restituição"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
