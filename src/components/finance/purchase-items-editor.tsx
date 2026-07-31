import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { toCents } from "@/lib/finance";
import {
  ITEM_SUGGESTIONS,
  MEASURE_UNITS,
  emptyItem,
  itemsTotal,
  validatePurchaseItems,
  unitIsWeighted,
  type ItemDraft,
} from "@/lib/purchase-items";

function toNumber(raw: string): number {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function money(value: number): string {
  return value ? String(toCents(value)).replace(".", ",") : "";
}

/**
 * Detalhamento da compra: cada item com unidade de medida, quantidade,
 * peso e valor. Serve tanto para o conjunto (feira) quanto para itens soltos.
 */
export function PurchaseItemsEditor({
  items,
  onChange,
  onApplyTotal,
  amount = 0,
  showValidation = false,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
  onApplyTotal?: (total: number) => void;
  amount?: number;
  showValidation?: boolean;
}) {
  const total = itemsTotal(items);
  const check = validatePurchaseItems(items, amount);
  const issueByIndex = new Map(check.issues.map((issue) => [issue.index, issue.message]));

  function update(index: number, patch: Partial<ItemDraft>) {
    const next = items.map((item, position) => (position === index ? { ...item, ...patch } : item));
    const target = next[index];
    if (target && (patch.quantity !== undefined || patch.unitPrice !== undefined)) {
      const quantity = toNumber(target.quantity);
      const unitPrice = toNumber(target.unitPrice);
      if (quantity > 0 && unitPrice > 0) {
        target.total = money(quantity * unitPrice);
      }
    }
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-sm">O que foi comprado</Label>
          <p className="text-xs text-muted-foreground">
            Registre a feira inteira ou item por item, com unidade, quantidade e peso.
          </p>
        </div>
        <Badge
          variant={check.totalMismatch ? "destructive" : "secondary"}
          className="tabular-nums"
        >
          Itens: {formatCurrency(total)}
        </Badge>
      </div>

      {check.totalMismatch ? (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              A soma dos itens ({formatCurrency(total)}) não bate com o valor do gasto (
              {formatCurrency(amount)}).
            </p>
            <p>
              Diferença de {formatCurrency(Math.abs(check.diff))}
              {check.diff > 0 ? " a mais nos itens." : " faltando nos itens."} Ajuste os itens ou use
              o botão abaixo para aplicar o total dos itens.
            </p>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-3 space-y-3">
          {items.map((item, index) => {
            const weighted = unitIsWeighted(item.unit);
            return (
              <div key={index} className="rounded-lg border border-border/70 bg-background p-2.5">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                    placeholder="Produto (ex.: banana, pão, feira)"
                    maxLength={120}
                    aria-label={`Item ${index + 1}`}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => onChange(items.filter((_, position) => position !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Unidade</Label>
                    <Select value={item.unit} onValueChange={(value) => update(index, { unit: value })}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEASURE_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Qtde</Label>
                    <Input
                      value={item.quantity}
                      inputMode="decimal"
                      onChange={(event) => update(index, { quantity: event.target.value })}
                      className="mt-1 h-9 tabular-nums"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      {weighted ? "Peso" : "Valor unit."}
                    </Label>
                    {weighted ? (
                      <Input
                        value={item.weight}
                        inputMode="decimal"
                        onChange={(event) => update(index, { weight: event.target.value })}
                        className="mt-1 h-9 tabular-nums"
                        placeholder="ex.: 1,250"
                      />
                    ) : (
                      <Input
                        value={item.unitPrice}
                        inputMode="decimal"
                        onChange={(event) => update(index, { unitPrice: event.target.value })}
                        className="mt-1 h-9 tabular-nums"
                        placeholder="0,00"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Total (R$)</Label>
                    <Input
                      value={item.total}
                      inputMode="decimal"
                      onChange={(event) => update(index, { total: event.target.value })}
                      className="mt-1 h-9 tabular-nums"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {weighted ? (
                  <div className="mt-2">
                    <Label className="text-[11px] text-muted-foreground">Valor por {item.unit}</Label>
                    <Input
                      value={item.unitPrice}
                      inputMode="decimal"
                      onChange={(event) => update(index, { unitPrice: event.target.value })}
                      className="mt-1 h-9 tabular-nums"
                      placeholder="0,00"
                    />
                  </div>
                ) : null}

                {showValidation && issueByIndex.has(index) ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {issueByIndex.get(index)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ITEM_SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion.name}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-xs"
            onClick={() =>
              onChange([
                ...items,
                { ...emptyItem(suggestion.unit), name: suggestion.name },
              ])
            }
          >
            + {suggestion.name}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...items, emptyItem()])}
        >
          <Plus className="mr-1.5 size-4" />
          Adicionar item
        </Button>
        {onApplyTotal && total > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onApplyTotal(total)}>
            Usar {formatCurrency(total)} como valor do gasto
          </Button>
        ) : null}
      </div>
    </div>
  );
}
