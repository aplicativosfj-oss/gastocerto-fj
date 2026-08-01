import { Download, FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

export type PeriodPdfSummary = {
  periodLabel: string;
  typeLabel: string;
  count: number;
  income: number;
  expense: number;
  balance: number;
  topCategories: { name: string; amount: number; share: number }[];
};

/**
 * Prévia do resumo antes de gerar o PDF: totais, saldo e principais categorias.
 * O download só acontece quando o usuário confirma.
 */
export function PeriodPdfPreview({
  summary,
  onDownload,
  children,
}: {
  summary: PeriodPdfSummary;
  onDownload: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" aria-hidden />
            Prévia do resumo do período
          </DialogTitle>
          <DialogDescription>
            {summary.typeLabel} · {summary.periodLabel} · {summary.count} lançamento(s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Receitas", value: summary.income, tone: "text-success" },
            { label: "Despesas", value: summary.expense, tone: "text-destructive" },
            {
              label: "Saldo",
              value: summary.balance,
              tone: summary.balance >= 0 ? "text-success" : "text-destructive",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className={`tabular mt-0.5 text-[15px] font-bold ${item.tone}`}>
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border">
          <p className="border-b border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Principais categorias
          </p>
          {summary.topCategories.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted-foreground">
              Nenhuma despesa categorizada no período.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.topCategories.map((category) => (
                <li key={category.name} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[12px]">{category.name}</span>
                  <span className="tabular text-[12px] font-semibold">
                    {formatCurrency(category.amount)}
                  </span>
                  <span className="tabular w-12 text-right text-[11px] text-muted-foreground">
                    {category.share.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDownload();
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download className="size-4" aria-hidden />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
