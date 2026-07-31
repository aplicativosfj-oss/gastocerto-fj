import { CalendarClock, CheckCircle2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildSchedule,
  INSTALLMENT_STATUS_LABEL,
  type InstallmentStatus,
  type ScheduleInstallment,
} from "@/lib/commitment-schedule";
import { exportScheduleCsv, exportSchedulePdf } from "@/lib/commitment-export";
import { useCommitmentEntries, useSaveCommitmentEntry, type CommitmentSummary } from "@/lib/commitments";
import { isoDate } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";


const STATUS_STYLE: Record<InstallmentStatus, string> = {
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  overdue: "border-destructive/40 bg-destructive/10 text-destructive",
  due_soon: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  open: "border-border bg-muted/40 text-muted-foreground",
};

/** Carnê automático: uma linha por parcela, com baixa rápida do pagamento. */
export function CommitmentScheduleDialog({
  summary,
  daysBefore,
  open,
  onOpenChange,
}: {
  summary: CommitmentSummary | null;
  daysBefore: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: entries, isLoading } = useCommitmentEntries();
  const saveEntry = useSaveCommitmentEntry();
  const [paying, setPaying] = useState<number | null>(null);

  const commitment = summary?.commitment ?? null;
  const schedule = commitment ? buildSchedule(commitment, entries ?? [], { daysBefore }) : null;

  async function payInstallment(item: ScheduleInstallment) {
    if (!commitment) return;
    setPaying(item.number);
    try {
      await saveEntry.mutateAsync({
        values: {
          commitment_id: commitment.id,
          entry_type: "payment",
          amount: Math.max(item.amount - item.paidAmount, 0),
          entry_date: isoDate(new Date()),
          due_date: item.dueDate,
          installment_number: item.number,
          payment_method: commitment.payment_method,
          description: `Parcela ${item.number}/${schedule?.installments.length ?? ""}`,
        },
      });
      toast.success(`Parcela ${item.number} baixada.`);
    } catch (error) {
      toast.error("Não foi possível registrar o pagamento.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPaying(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            Carnê de parcelas
          </DialogTitle>
          <DialogDescription>
            {commitment
              ? `${commitment.name} — vencimentos calculados automaticamente mês a mês. Você é avisado ${daysBefore} dia(s) antes de cada parcela.`
              : "Selecione um compromisso."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !schedule ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Este compromisso é de conta aberta ou não tem número de parcelas definido. Informe a
            quantidade de parcelas na edição para gerar o carnê automático.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Parcelas" value={`${schedule.paidCount}/${schedule.installments.length}`} />
              <Stat label="Total do carnê" value={formatCurrency(schedule.total)} />
              <Stat label="Falta pagar" value={formatCurrency(schedule.remaining)} tone="alert" />
              <Stat
                label="Próximo vencimento"
                value={
                  schedule.nextOpen
                    ? formatDate(`${schedule.nextOpen.dueDate}T12:00:00`)
                    : "Quitado"
                }
              />
            </div>

            <Progress
              value={(schedule.paidCount / schedule.installments.length) * 100}
              className="h-1.5"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => {
                  if (!commitment) return;
                  void exportSchedulePdf(commitment, schedule).catch(() =>
                    toast.error("Não foi possível gerar o PDF."),
                  );
                }}
              >
                <FileText className="mr-1.5 size-3.5" />
                Exportar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => {
                  if (!commitment) return;
                  exportScheduleCsv(commitment, schedule);
                }}
              >
                <FileSpreadsheet className="mr-1.5 size-3.5" />
                Exportar CSV
              </Button>
              <p className="self-center text-[11px] text-muted-foreground">
                Inclui vencimento, valor da parcela, valor pago, situação e saldo devedor.
              </p>
            </div>



            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {schedule.installments.map((item) => (
                <li key={item.number} className="flex flex-wrap items-center gap-2 p-2 text-xs">
                  <span className="w-12 shrink-0 font-semibold tabular-nums">
                    {item.number}/{schedule.installments.length}
                  </span>
                  <span className="w-24 shrink-0 tabular-nums">
                    {formatDate(`${item.dueDate}T12:00:00`)}
                  </span>
                  <span className="w-24 shrink-0 font-medium tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[item.status]}`}>
                    {INSTALLMENT_STATUS_LABEL[item.status]}
                    {item.status === "overdue" ? ` · ${Math.abs(item.daysToDue)}d` : ""}
                    {item.status === "due_soon" ? ` · ${item.daysToDue}d` : ""}
                  </Badge>
                  {item.paidAmount > 0 && item.status !== "paid" ? (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      pago {formatCurrency(item.paidAmount)}
                    </span>
                  ) : null}
                  <span className="ml-auto">
                    {item.status === "paid" ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={paying !== null}
                        onClick={() => void payInstallment(item)}
                      >
                        {paying === item.number ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : null}
                        Dar baixa
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "alert" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone === "alert" ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}
