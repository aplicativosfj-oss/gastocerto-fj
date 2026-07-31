import { useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { monthLabel } from "@/lib/closing";
import {
  REOPEN_STATUS_LABEL,
  useAllReopenRequests,
  useDecideReopenRequest,
  type ReopenRequest,
} from "@/lib/closing-lock";
import { formatDate } from "@/lib/format";

/** Fila de pedidos de reabertura de competências fechadas. */
export function ReopenRequestsPanel() {
  const { data: requests, isLoading } = useAllReopenRequests();
  const decide = useDecideReopenRequest();
  const [hours, setHours] = useState("48");
  const [note, setNote] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const pending = (requests ?? []).filter((request) => request.status === "pending");
  const history = (requests ?? []).filter((request) => request.status !== "pending");

  async function handleDecision(request: ReopenRequest, approve: boolean) {
    try {
      await decide.mutateAsync({
        request,
        approve,
        hours: Number(hours) || 48,
        note,
      });
      toast.success(approve ? "Mês liberado para edição." : "Pedido recusado.");
      setActive(null);
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a decisão.");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4 text-muted-foreground" />
            Pedidos pendentes
          </h3>
          <Badge variant="secondary">{pending.length}</Badge>
        </div>

        {pending.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Nenhum pedido aguardando análise.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((request) => (
              <li key={request.id} className="rounded-lg border border-border/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {monthLabel(request.year, request.month)}
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                      solicitado em {formatDate(request.created_at.slice(0, 10))}
                    </span>
                  </p>
                  {active === request.id ? null : (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8" onClick={() => setActive(request.id)}>
                        Analisar
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{request.reason}</p>

                {active === request.id ? (
                  <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                    <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                      <div>
                        <Label htmlFor={`hours-${request.id}`} className="text-xs">
                          Horas liberadas
                        </Label>
                        <Input
                          id={`hours-${request.id}`}
                          type="number"
                          min={1}
                          max={720}
                          value={hours}
                          onChange={(event) => setHours(event.target.value)}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`note-${request.id}`} className="text-xs">
                          Observação ao cliente
                        </Label>
                        <Textarea
                          id={`note-${request.id}`}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          maxLength={300}
                          className="mt-1 min-h-[38px]"
                          placeholder="Ex.: liberado apenas para ajustar a compra do dia 28."
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={decide.isPending}
                        onClick={() => handleDecision(request, true)}
                      >
                        <Check className="mr-1.5 size-3.5" />
                        Liberar edição
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={decide.isPending}
                        onClick={() => handleDecision(request, false)}
                      >
                        <X className="mr-1.5 size-3.5" />
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setActive(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-sm font-semibold">Histórico de decisões</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Sem decisões registradas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.slice(0, 20).map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-2 text-xs"
              >
                <span className="font-medium">
                  {monthLabel(request.year, request.month)}
                  {request.reopen_until ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      até {formatDate(request.reopen_until.slice(0, 10))}
                    </span>
                  ) : null}
                </span>
                <Badge variant={request.status === "approved" ? "secondary" : "destructive"}>
                  {REOPEN_STATUS_LABEL[request.status] ?? request.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
