import { useEffect, useState } from "react";
import { Check, History, NotebookPen, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { NOTE_FIELD_LABEL, useNoteHistory, useRefreshNoteHistory } from "@/lib/transaction-notes";
import { useSaveTransaction, type Transaction } from "@/lib/transactions";

/** Painel inline (expandido na lista) para ler, editar e auditar as anotações. */
export function InlineNotes({ transaction }: { transaction: Transaction }) {
  const save = useSaveTransaction();
  const refreshHistory = useRefreshNoteHistory();
  const { data: history } = useNoteHistory(transaction.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(transaction.notes ?? "");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setDraft(transaction.notes ?? "");
    setEditing(false);
  }, [transaction.id, transaction.notes]);

  async function submit() {
    try {
      await save.mutateAsync({
        id: transaction.id,
        values: { notes: draft.trim() || null } as never,
      });
      await refreshHistory(transaction.id);
      setEditing(false);
      toast.success("Anotações salvas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar as anotações");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <NotebookPen className="size-3.5" /> Anotações do lançamento
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setShowHistory((value) => !value)}
          >
            <History className="mr-1 size-3" /> Histórico ({history?.length ?? 0})
          </Button>
          {editing ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setDraft(transaction.notes ?? "");
                  setEditing(false);
                }}
              >
                <X className="size-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={save.isPending}
                onClick={submit}
              >
                <Check className="mr-1 size-3" /> Salvar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setEditing(true)}
            >
              {transaction.notes ? "Editar" : "Adicionar"}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Contexto do gasto: estabelecimento, motivo, para quem foi…"
          className="text-xs"
        />
      ) : (
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">
          {transaction.notes || "Nenhuma anotação registrada."}
        </p>
      )}

      {showHistory ? (
        (history ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma alteração registrada até agora.</p>
        ) : (
          <ul className="space-y-1.5">
            {(history ?? []).map((entry) => (
              <li key={entry.id} className="rounded-md bg-background/60 px-2 py-1.5 text-xs">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatDateTime(entry.changed_at)} · {NOTE_FIELD_LABEL[entry.field] ?? entry.field}
                </p>
                <p className="mt-0.5 text-muted-foreground line-through">
                  {entry.old_value || "(vazio)"}
                </p>
                <p className="font-medium">{entry.new_value || "(vazio)"}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
