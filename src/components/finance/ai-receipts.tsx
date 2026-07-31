import { Badge } from "@/components/ui/badge";
import { EmblemReceipt } from "@/components/ui/panel-emblems";
import type { AiReceipt } from "@/lib/ai-guard";

const REASON_LABEL: Record<string, string> = {
  admin: "Administrador",
  paid_license: "Licença paga ativa",
  paid_plan: "Plano pago",
  trial_plan: "Plano de teste (trial)",
  free_plan: "Plano gratuito",
  no_plan: "Sem plano vinculado",
  monthly_quota: "Limite mensal atingido",
};

const ACTION_LABEL: Record<string, string> = {
  allowed: "Executada",
  blocked: "Bloqueada",
  quota_exceeded: "Limite excedido",
  rate_limited: "Excesso de tentativas",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiReceipts({ receipts }: { receipts: AiReceipt[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center gap-3">
        <EmblemReceipt title="Recibos de uso da IA" />
        <div>
          <h2 className="text-sm font-semibold">Recibos por execução</h2>
          <p className="text-xs text-muted-foreground">
            Cada análise ou bloqueio fica registrado com data, plano, motivo e créditos estimados.
          </p>
        </div>
      </header>

      {receipts.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Nenhuma execução registrada ainda.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/70">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="flex flex-wrap items-start gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium tabular-nums">
                    {formatDate(receipt.createdAt)}
                  </span>
                  <Badge variant={receipt.allowed ? "secondary" : "outline"} className="text-[10px]">
                    {ACTION_LABEL[receipt.action] ?? receipt.action}
                  </Badge>
                  {receipt.planSlug ? (
                    <Badge variant="outline" className="text-[10px]">
                      Plano {receipt.planSlug}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {receipt.allowed ? "Liberada por: " : "Motivo do bloqueio: "}
                  {REASON_LABEL[receipt.reason] ?? receipt.reason}
                  {receipt.question ? ` · “${receipt.question}”` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {receipt.credits.toFixed(3)}
                  <span className="text-xs font-normal text-muted-foreground"> créd.</span>
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {receipt.totalTokens.toLocaleString("pt-BR")} tokens
                  {receipt.model ? ` · ${receipt.model.split("/").pop()}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
