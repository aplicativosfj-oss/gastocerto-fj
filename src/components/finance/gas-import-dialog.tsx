import { useMemo, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { GAS_CSV_TEMPLATE, parseGasCsv } from "@/lib/gas-import";
import { useGasExpenseSync } from "@/lib/gas-expense";
import { useGasRefills, useSaveGasRefill } from "@/lib/gas";

/** Importa o histórico de trocas de gás a partir de CSV ou planilha colada. */
export function GasImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [createExpenses, setCreateExpenses] = useState(false);
  const [running, setRunning] = useState(false);
  const save = useSaveGasRefill();
  const { data: existing } = useGasRefills();
  const { sync } = useGasExpenseSync();

  const parsed = useMemo(() => parseGasCsv(text), [text]);

  const existingKeys = useMemo(
    () =>
      new Set(
        (existing ?? []).map(
          (item) => `${item.refill_date.slice(0, 10)}:${Number(item.amount).toFixed(2)}`,
        ),
      ),
    [existing],
  );

  const newRows = parsed.rows.filter(
    (row) => !existingKeys.has(`${row.refill_date}:${row.amount.toFixed(2)}`),
  );
  const duplicates = parsed.rows.length - newRows.length;

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
  }

  async function handleImport() {
    if (newRows.length === 0) {
      toast.error("Nenhuma linha nova para importar.");
      return;
    }
    setRunning(true);
    let imported = 0;
    try {
      for (const row of newRows) {
        let transactionId: string | null = null;
        if (createExpenses) {
          try {
            transactionId = await sync({
              refillDate: row.refill_date,
              amount: row.amount,
              supplier: row.supplier,
              paymentMethod: row.payment_method,
              sizeKg: row.size_kg,
            });
          } catch (error) {
            console.error("[gas-import] falha ao lançar despesa", error);
          }
        }
        await save.mutateAsync({
          values: {
            refill_date: row.refill_date,
            amount: row.amount,
            size_kg: row.size_kg,
            supplier: row.supplier,
            payment_method: row.payment_method,
            notes: row.notes,
            transaction_id: transactionId,
          },
        });
        imported += 1;
      }
      toast.success(`${imported} troca(s) importada(s) com sucesso!`);
      setText("");
      onOpenChange(false);
    } catch (error) {
      console.error("[gas-import] falha", error);
      toast.error(
        imported > 0
          ? `${imported} troca(s) importada(s) antes do erro. Revise o restante do arquivo.`
          : "Não foi possível importar o histórico.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" aria-hidden />
            Importar histórico de trocas de gás
          </DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV ou cole as linhas da sua planilha na ordem:{" "}
            <strong>data; valor; tamanho (kg); revenda; pagamento; observação</strong>. As duas
            primeiras colunas são obrigatórias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Label htmlFor="gas-file">Arquivo CSV / TXT</Label>
              <Input
                id="gas-file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="mt-1.5"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>
            <Button variant="outline" onClick={() => setText(GAS_CSV_TEMPLATE)}>
              Usar exemplo
            </Button>
          </div>

          <div>
            <Label htmlFor="gas-paste">Ou cole aqui as linhas</Label>
            <Textarea
              id="gas-paste"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              className="mt-1.5 font-mono text-xs"
              placeholder={GAS_CSV_TEMPLATE}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createExpenses}
              onChange={(event) => setCreateExpenses(event.target.checked)}
              className="size-4 accent-[oklch(0.72_0.17_45)]"
            />
            Lançar também cada troca importada como despesa na categoria <strong>Gás</strong>
          </label>

          {parsed.errors.length > 0 ? (
            <ul className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {parsed.errors.slice(0, 6).map((error) => (
                <li key={error.line}>
                  Linha {error.line}: {error.message}
                </li>
              ))}
              {parsed.errors.length > 6 ? (
                <li>… e mais {parsed.errors.length - 6} linha(s) com problema.</li>
              ) : null}
            </ul>
          ) : null}

          {parsed.rows.length > 0 ? (
            <div className="rounded-xl border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {newRows.length} nova(s) troca(s) prontas para importar
                  {duplicates > 0 ? ` · ${duplicates} já existente(s) serão ignoradas` : ""}
                </span>
              </div>
              <div className="max-h-56 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">kg</TableHead>
                      <TableHead>Revenda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newRows.map((row) => (
                      <TableRow key={`${row.refill_date}-${row.line}`}>
                        <TableCell>{formatDate(row.refill_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.size_kg}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.supplier ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={running || newRows.length === 0}>
            {running ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Importar {newRows.length > 0 ? `${newRows.length} troca(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
