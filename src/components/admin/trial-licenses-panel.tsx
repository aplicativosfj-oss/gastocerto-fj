import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Gift, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { adminCreateTrialLicenses, adminListLicenses } from "@/lib/licenses.functions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando ativação",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

/**
 * Geração de licenças de teste (7 dias, sem IA) para o administrador doar.
 * A chave só passa a valer quando o cliente a ativa dentro do app.
 */
export function TrialLicensesPanel() {
  const create = useServerFn(adminCreateTrialLicenses);
  const listLicenses = useServerFn(adminListLicenses);
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState("5");
  const [notes, setNotes] = useState("");

  const licenses = useQuery({
    queryKey: ["admin", "licenses"],
    queryFn: () => listLicenses(),
  });

  const trials = useMemo(
    () =>
      (licenses.data?.licenses ?? []).filter(
        (row: { source: string }) => row.source === "trial_gift",
      ),
    [licenses.data],
  );

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: { quantity: Math.max(1, Math.min(50, Number(quantity) || 1)), notes: notes || undefined },
      }),
    onSuccess: (created) => {
      toast.success(`${created.length} licença(s) de teste gerada(s).`);
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível gerar as licenças."),
  });

  const pendingKeys = trials
    .filter((row: { status: string }) => row.status === "pending")
    .map((row: { license_key: string }) => row.license_key);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center gap-2">
        <Gift className="size-5 text-primary" aria-hidden />
        <div>
          <h2 className="font-display text-base font-semibold">Licenças de teste para doar</h2>
          <p className="text-xs text-muted-foreground">
            7 dias de acesso com recursos limitados e <strong>sem Consultor de IA</strong>. Entregue
            a chave ao cliente — ela só começa a contar quando ele ativar no app.
          </p>
        </div>
      </header>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="w-28">
          <Label htmlFor="trial-qty">Quantidade</Label>
          <Input
            id="trial-qty"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))}
            className="mt-1.5"
          />
        </div>
        <div className="min-w-56 flex-1">
          <Label htmlFor="trial-notes">Observação (opcional)</Label>
          <Input
            id="trial-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Campanha Instagram — outubro"
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Gerar chaves
        </Button>
        {pendingKeys.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(pendingKeys.join("\n"));
              toast.success("Chaves pendentes copiadas.");
            }}
          >
            <Copy className="size-4" />
            Copiar pendentes
          </Button>
        ) : null}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Gerada em</TableHead>
              <TableHead>Ativada em</TableHead>
              <TableHead>Expira em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : trials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma licença de teste gerada ainda.
                </TableCell>
              </TableRow>
            ) : (
              trials.map(
                (row: {
                  id: string;
                  license_key: string;
                  status: string;
                  created_at: string;
                  activated_at: string | null;
                  expires_at: string | null;
                }) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.license_key}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "active" ? "default" : "secondary"}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.activated_at ? formatDateTime(row.activated_at) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.expires_at ? formatDateTime(row.expires_at) : "—"}
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
