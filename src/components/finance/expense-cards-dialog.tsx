import { useMemo, useState } from "react";
import { ArrowLeft, Check, Delete, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { readRecentCategories, rememberCategory } from "@/components/finance/category-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { categoryIcon } from "@/lib/category-icons";
import { isoDate, toCents } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useSaveTransaction, type Category } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "back"] as const;

function digitsToCents(digits: string) {
  return Number(digits || "0");
}

function shiftIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

/**
 * Lançamento rápido em dois toques: escolha o card da categoria e digite o
 * valor. Sem formulário longo — o restante fica no lançamento completo.
 */
export function ExpenseCardsDialog({
  open,
  onOpenChange,
  onAdvanced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvanced?: () => void;
}) {
  const { data: categories } = useCategories();
  const save = useSaveTransaction();

  const [selected, setSelected] = useState<Category | null>(null);
  const [digits, setDigits] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [search, setSearch] = useState("");

  const expenseCategories = useMemo(() => {
    const all = (categories ?? []).filter(
      (category) => category.type === "expense" && category.active !== false,
    );
    const recent = readRecentCategories();
    const score = (id: string) => {
      const index = recent.indexOf(id);
      return index === -1 ? 999 : index;
    };
    const term = search.trim().toLowerCase();
    return all
      .filter((category) => !term || category.name.toLowerCase().includes(term))
      .sort((a, b) => score(a.id) - score(b.id) || a.name.localeCompare(b.name));
  }, [categories, search]);

  const cents = digitsToCents(digits);

  function reset() {
    setSelected(null);
    setDigits("");
    setNote("");
    setDate(isoDate(new Date()));
    setSearch("");
  }

  function press(key: (typeof KEYS)[number]) {
    if (key === "back") {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    setDigits((current) => (current + key).replace(/^0+/, "").slice(0, 9));
  }

  async function handleSave() {
    if (!selected) return;
    if (cents <= 0) {
      toast.error("Digite o valor do gasto.");
      return;
    }
    try {
      await save.mutateAsync({
        values: {
          description: note.trim() ? note.trim().slice(0, 140) : selected.name,
          amount: cents / 100,
          transaction_type: "expense",
          category_id: selected.id,
          transaction_date: date,
          status: "paid",
          payment_date: date,
        },
      });
      rememberCategory(selected.id);
      toast.success(`${formatCurrency(cents)} em ${selected.name} registrado.`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível registrar o gasto.", {
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
          <DialogTitle>
            {selected ? `Quanto gastou em ${selected.name}?` : "Registrar gasto"}
          </DialogTitle>
          <DialogDescription>
            {selected
              ? "Digite o valor, confirme a data e salve."
              : "Toque no card do gasto — em dois toques está lançado."}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoria (feira, gás, combustível...)"
              className="h-10"
              aria-label="Buscar categoria"
            />

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {expenseCategories.slice(0, 24).map((category) => {
                const Icon = categoryIcon(category.icon);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelected(category)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="flex size-9 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${category.color ?? "#64748b"}22`,
                        color: category.color ?? undefined,
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {expenseCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma categoria encontrada.</p>
            ) : null}

            {onAdvanced ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  onAdvanced();
                }}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Lançamento completo (conta, parcelas, anexos)
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-center text-3xl font-bold tabular-nums">
              {formatCurrency(cents)}
            </p>

            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="h-12 text-base font-semibold"
                  onClick={() => press(key)}
                  aria-label={key === "back" ? "Apagar último dígito" : `Digitar ${key}`}
                >
                  {key === "back" ? <Delete className="size-4" aria-hidden /> : key}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Hoje", value: isoDate(new Date()) },
                { label: "Ontem", value: shiftIso(1) },
                { label: "Anteontem", value: shiftIso(2) },
              ].map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  size="sm"
                  variant={date === option.value ? "secondary" : "outline"}
                  className={cn("h-8 text-[11px]")}
                  onClick={() => setDate(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-8 w-auto text-xs"
                aria-label="Data do gasto"
              />
            </div>

            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={140}
              placeholder={`Onde foi? (opcional) — ex.: ${selected.name}`}
              className="h-10"
              aria-label="Descrição do gasto"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setSelected(null);
                  setDigits("");
                }}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Trocar categoria
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={save.isPending || cents <= 0}
                onClick={handleSave}
              >
                <Check className="size-4" aria-hidden />
                Salvar gasto
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
