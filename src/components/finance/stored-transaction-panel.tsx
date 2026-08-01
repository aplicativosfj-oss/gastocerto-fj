import { useState } from "react";
import { Archive, ChevronDown, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { NOTE_FIELD_LABEL, useNoteHistory } from "@/lib/transaction-notes";
import { PAYMENT_METHODS, TRANSACTION_STATUS } from "@/lib/finance";

type StoredTransactionPanelProps = {
  transaction: Tables<"transactions">;
  /** Nome da categoria guardada no lançamento. */
  categoryName?: string | null;
  enabled?: boolean;
};

function label(list: ReadonlyArray<{ value: string; label: string }>, value: string | null) {
  if (!value) return "—";
  return list.find((item) => item.value === value)?.label ?? value;
}

/**
 * Mostra o que está gravado no lançamento (competência anterior) antes de
 * qualquer alteração, junto com o histórico de edições registradas.
 */
export function StoredTransactionPanel({
  transaction,
  categoryName,
  enabled = true,
}: StoredTransactionPanelProps) {
  const [open, setOpen] = useState(false);
  const { data: history } = useNoteHistory(transaction.id, enabled && open);

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 sm:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Archive className="size-4 text-primary" />
          Dados guardados deste lançamento
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Ocultar" : "Ver"}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Descrição original</dt>
              <dd className="font-medium text-foreground">{transaction.description}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Valor guardado</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(Number(transaction.amount))}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data da competência</dt>
              <dd className="font-medium text-foreground">
                {formatDate(transaction.transaction_date)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Categoria</dt>
              <dd className="font-medium text-foreground">{categoryName || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Forma de pagamento</dt>
              <dd className="font-medium text-foreground">
                {label(PAYMENT_METHODS, transaction.payment_method)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Situação</dt>
              <dd className="font-medium text-foreground">
                {label(TRANSACTION_STATUS, transaction.status)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Anotações guardadas</dt>
              <dd className="whitespace-pre-wrap font-medium text-foreground">
                {transaction.notes || "—"}
              </dd>
            </div>
            <div className="col-span-2 text-muted-foreground">
              Registrado em {formatDate(transaction.created_at)} · última alteração em{" "}
              {formatDate(transaction.updated_at)}
            </div>
          </dl>

          <div className="rounded-lg border border-border bg-background p-2.5">
            <p className="flex items-center gap-2 text-xs font-medium text-foreground">
              <History className="size-3.5" /> Histórico de alterações ({history?.length ?? 0})
            </p>
            {(history ?? []).length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhuma alteração registrada até agora.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {(history ?? []).map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <span className="font-medium text-foreground">
                      {NOTE_FIELD_LABEL[entry.field] ?? entry.field}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      · {formatDate(entry.changed_at)}
                    </span>
                    <div className="text-muted-foreground">
                      <span className="line-through">{entry.old_value || "—"}</span> →{" "}
                      <span className="text-foreground">{entry.new_value || "—"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
