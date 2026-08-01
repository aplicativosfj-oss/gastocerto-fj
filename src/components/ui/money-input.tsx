import * as React from "react";

import { Input } from "@/components/ui/input";
import { amountToInput, maskAmountInput } from "@/lib/money-input";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "defaultValue" | "type"
> & {
  /** Uso controlado: passe `value` + `onValueChange`. */
  value?: string;
  onValueChange?: (masked: string) => void;
  /** Uso não controlado (formulários com FormData): valor inicial numérico. */
  defaultValue?: number | string | null;
};

/**
 * Campo de dinheiro com máscara automática: o usuário digita apenas números e
 * o sistema formata em 1.234,56 enquanto digita, em todo o sistema.
 */
export function MoneyInput({
  value,
  onValueChange,
  defaultValue,
  className,
  ...rest
}: MoneyInputProps) {
  const controlled = value !== undefined && onValueChange !== undefined;
  const [internal, setInternal] = React.useState(() =>
    value !== undefined ? value : amountToInput(defaultValue ?? ""),
  );

  const current = controlled ? (value as string) : internal;

  return (
    <Input
      {...rest}
      inputMode="decimal"
      autoComplete="off"
      value={current}
      onChange={(event) => {
        const masked = maskAmountInput(event.target.value);
        if (controlled) onValueChange?.(masked);
        else setInternal(masked);
      }}
      className={cn("tabular-nums", className)}
    />
  );
}
