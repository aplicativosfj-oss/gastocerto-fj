import { Lock, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmblemAlert, EmblemGauge } from "@/components/ui/panel-emblems";
import type { AiUsageSummary } from "@/lib/ai-guard";

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function AiCreditsPanel({
  usage,
  entitled,
  planSlug,
}: {
  usage: AiUsageSummary;
  entitled: boolean;
  planSlug?: string;
}) {
  const queryPct = pct(usage.queries, usage.queryLimit);
  const creditPct = pct(usage.credits, usage.creditAllowance);
  const remainingCredits = Math.max(0, usage.creditAllowance - usage.credits);
  const remainingQueries = Math.max(0, usage.queryLimit - usage.queries);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <EmblemGauge title="Medidor de créditos de IA" />
          <div>
            <h2 className="text-sm font-semibold">Créditos de IA deste mês</h2>
            <p className="text-xs text-muted-foreground">
              Consumo estimado das análises do Consultor.
            </p>
          </div>
        </div>
        <Badge variant={entitled ? "secondary" : "outline"}>
          {entitled ? (
            <>
              <Sparkles className="mr-1 size-3" /> Plano {planSlug ?? "pago"}
            </>
          ) : (
            <>
              <Lock className="mr-1 size-3" /> Sem acesso
            </>
          )}
        </Badge>
      </header>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Consultas usadas</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {usage.queries}
            <span className="text-sm font-normal text-muted-foreground"> / {usage.queryLimit}</span>
          </dd>
          <Progress value={queryPct} className="mt-1 h-2" aria-label="Consultas usadas no mês" />
          <p className="mt-1 text-xs text-muted-foreground">
            Restam {remainingQueries} consulta(s) neste mês.
          </p>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Créditos consumidos (estimativa)</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {usage.credits.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {usage.creditAllowance.toFixed(0)}
            </span>
          </dd>
          <Progress value={creditPct} className="mt-1 h-2" aria-label="Créditos consumidos no mês" />
          <p className="mt-1 text-xs text-muted-foreground">
            Restam {remainingCredits.toFixed(2)} crédito(s) · {usage.totalTokens.toLocaleString("pt-BR")} tokens
            processados.
          </p>
        </div>
      </dl>

      {entitled && usage.lowBalance && !usage.quotaExceeded ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-3 rounded-xl border border-[oklch(0.82_0.16_85/0.45)] bg-[oklch(0.82_0.16_85/0.08)] p-3"
        >
          <EmblemAlert title="Créditos de IA baixos" className="size-8" />
          <div className="text-xs">
            <p className="font-semibold">
              Seus créditos de IA estão abaixo de {Math.round(usage.lowBalanceRatio * 100)}%
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Restam {remainingCredits.toFixed(2)} crédito(s) e {remainingQueries} consulta(s) neste
              mês. Planeje o upgrade antes que as análises sejam bloqueadas.
            </p>
          </div>
        </div>
      ) : null}

      {usage.quotaExceeded ? (
        <p className="mt-3 rounded-xl border border-[oklch(0.68_0.19_30/0.4)] bg-[oklch(0.68_0.19_30/0.08)] p-3 text-xs">
          Limite mensal atingido — novas análises ficam bloqueadas até o início do próximo mês.
        </p>
      ) : null}

      {usage.blocked > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {usage.blocked} tentativa(s) registrada(s) no histórico sem consumo de créditos (bloqueio
          por plano ou limite).
        </p>
      ) : null}
    </section>
  );
}
