import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
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
import { recalcFromNextDue } from "@/lib/commitment-schedule";
import { useSaveCommitment, type Commitment } from "@/lib/commitments";
import { formatCurrency, formatDate } from "@/lib/format";

/**
 * Edição rápida do próximo vencimento: ao trocar a data, o sistema recalcula
 * parcelas pagas, parcelas restantes, valor a pagar e o término do compromisso.
 */
export function NextDueQuickEdit({
  commitment,
  open,
  onOpenChange,
}: {
  commitment: Commitment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveCommitment();
  const [nextDue, setNextDue] = useState(commitment.next_due_date ?? commitment.start_date);

  const preview = nextDue ? recalcFromNextDue(commitment, nextDue) : null;

  async function handleSave() {
    if (!preview) return;
    try {
      await save.mutateAsync({
        id: commitment.id,
        values: {
          name: commitment.name,
          commitment_type: commitment.commitment_type,
          total_amount: commitment.total_amount,
          start_date: commitment.start_date,
          next_due_date: preview.next_due_date,
          due_day: preview.due_day,
          installments_paid: preview.installments_paid,
          end_date: preview.end_date,
        },
      });
      toast.success("Vencimento e parcelas recalculados.");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível atualizar o vencimento.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            Próximo vencimento
          </DialogTitle>
          <DialogDescription>
            {commitment.name} — ajuste apenas a data e o sistema recalcula parcelas pagas, o que
            falta e o término.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="nq-date">Novo próximo vencimento</Label>
          <Input
            id="nq-date"
            type="date"
            value={nextDue}
            onChange={(event) => setNextDue(event.target.value)}
            className="mt-1.5"
          />
        </div>

        {preview ? (
          <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
            <Row label="Parcelas pagas" value={`${preview.installments_paid}`} />
            <Row
              label="Parcelas restantes"
              value={preview.remainingCount == null ? "—" : `${preview.remainingCount}`}
            />
            <Row label="Valor da parcela" value={formatCurrency(preview.installmentAmount)} />
            <Row label="Falta pagar" value={formatCurrency(preview.remainingAmount)} />
            <Row
              label="Término previsto"
              value={preview.end_date ? formatDate(`${preview.end_date}T12:00:00`) : "—"}
            />
            <Row label="Dia de vencimento" value={`dia ${preview.due_day}`} />
          </dl>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending || !nextDue}>
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Recalcular e salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
