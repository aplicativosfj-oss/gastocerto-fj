import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Gift, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { adminCreateTrialLicenses, adminListLicenses, adminDeleteLicense } from "@/lib/licenses.functions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando ativação",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

/**
 * Geração de códigos de teste (7, 15 ou 30 dias, sem IA) para o administrador
 * doar. O código só passa a valer quando o cliente o ativa no site ou no app.
 */
export function TrialLicensesPanel() {
  const create = useServerFn(adminCreateTrialLicenses);
  const listLicenses = useServerFn(adminListLicenses);
  const queryClient = useQueryClient();
  const deleteLicense = useServerFn(adminDeleteLicense);

  const [quantity, setQuantity] = useState("5");
  const [trialDays, setTrialDays] = useState("15");
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

  /** Códigos de 15 dias ainda não usados (prontos para entregar). */
  const available15 = useMemo(
    () =>
      trials.filter(
        (row: { status: string; trial_days?: number | null }) =>
          row.status === "pending" && Number(row.trial_days ?? 7) === 15,
      ).length,
    [trials],
  );

  const mutation = useMutation({
    mutationFn: (input: { quantity: number; days: 7 | 15 | 30 }) =>
      create({
        data: {
          quantity: input.quantity,
          trialDays: input.days,
          notes: notes || undefined,
        },
      }),
    onSuccess: (created) => {
      toast.success(`${created.length} código(s) de teste gerado(s).`);
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível gerar os códigos."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLicense({ data: { id } }),
    onSuccess: () => {
      toast.success("Licença excluída com sucesso.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível excluir a licença."),
  });

  const pendingKeys = trials
    .filter((row: { status: string }) => row.status === "pending")
    .map((row: { license_key: string }) => row.license_key);


  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center gap-2">
        <Gift className="size-5 text-primary" aria-hidden />
        <div>
          <h2 className="font-display text-base font-semibold">Códigos de teste para doar</h2>
          <p className="text-xs text-muted-foreground">
            Acesso com recursos limitados e <strong>sem Consultor de IA</strong>. Entregue o código
            ao cliente — a validade só começa a contar quando ele ativar no site ou no app. Ao
            vencer, a conta fica somente leitura até a compra de um plano.
          </p>
        </div>
      </header>

      <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">Diferença entre Teste e Licença:</h3>
        <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
          <li><strong>Teste (Cortesia):</strong> Aplicado direto ao perfil do usuário. <strong>Com IA liberada.</strong></li>
          <li><strong>Código para Doar:</strong> Você gera chaves para enviar por e-mail/rede social. <strong>Sem IA.</strong></li>
          <li>A validade do código só começa quando o cliente ativa a chave no painel dele.</li>
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-2.5">
        <p className="text-xs text-muted-foreground">
          Códigos de <strong>15 dias</strong> ativos e disponíveis:{" "}
          <strong className="tabular text-foreground">{available15}</strong>
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => {
            setQuantity("10");
            setTrialDays("15");
            mutation.mutate({ quantity: 10, days: 15 });
          }}
        >
          {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Gerar 10 códigos de 15 dias
        </Button>
      </div>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            quantity: Math.max(1, Math.min(50, Number(quantity) || 1)),
            days: Number(trialDays) as 7 | 15 | 30,
          });
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
        <div className="w-36">
          <Label htmlFor="trial-days">Validade</Label>
          <Select value={trialDays} onValueChange={setTrialDays}>
            <SelectTrigger id="trial-days" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="15">15 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
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
          Gerar códigos
        </Button>
        {pendingKeys.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(pendingKeys.join("\n"));
              toast.success("Códigos pendentes copiados.");
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
               <TableHead className="w-[50px]"></TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir esta licença?")) {
                            deleteMutation.mutate(row.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
