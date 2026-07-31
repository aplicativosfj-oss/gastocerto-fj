import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePlanAccess } from "@/hooks/use-plan";
import { formatDateTime } from "@/lib/format";
import { startTrial } from "@/lib/plan.functions";
import { FEATURE_LABEL, FREE_FEATURES, TRIAL_OPTIONS, type TrialSlug } from "@/lib/plan-features";

const TIER_LABEL: Record<string, string> = {
  free: "Gratuito",
  trial: "Teste liberado",
  paid: "Assinante",
};

export function TrialCard() {
  const activate = useServerFn(startTrial);
  const queryClient = useQueryClient();
  const query = usePlanAccess();
  const access = query.data;

  const mutation = useMutation({
    mutationFn: (slug: TrialSlug) => activate({ data: { slug } }),
    onSuccess: (result) => {
      toast.success(`Teste de ${result.days} dias ativado! Tudo liberado até ${formatDateTime(result.endsAt)}.`);
      void queryClient.invalidateQueries({ queryKey: ["plan-access"] });
      void queryClient.invalidateQueries({ queryKey: ["advisor-access"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível ativar o teste."),
  });

  if (query.isLoading || !access) return null;

  const totalDays = TRIAL_OPTIONS.find((option) => option.slug === access.trialPlanSlug)?.days ?? 0;
  const usedPct =
    totalDays > 0 ? Math.min(100, Math.round(((totalDays - access.trialDaysLeft) / totalDays) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.72_0.14_160/0.15)]">
            <Sparkles className="size-4 text-[oklch(0.62_0.14_160)]" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Seu acesso</h2>
            <p className="text-xs text-muted-foreground">
              Plano atual: {access.planSlug} · nível {TIER_LABEL[access.tier] ?? access.tier}
            </p>
          </div>
        </div>
        <Badge variant={access.tier === "free" ? "outline" : "secondary"}>
          {TIER_LABEL[access.tier] ?? access.tier}
        </Badge>
      </header>

      {access.tier === "trial" ? (
        <div className="mt-3 rounded-xl border border-[oklch(0.72_0.14_160/0.4)] bg-[oklch(0.72_0.14_160/0.08)] p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4" aria-hidden />
            Faltam {access.trialDaysLeft} dia(s) do seu teste
          </p>
          <Progress value={usedPct} className="mt-2 h-2" aria-label="Tempo de teste consumido" />
          <p className="mt-1 text-xs text-muted-foreground">
            Tudo liberado até {access.trialEndsAt ? formatDateTime(access.trialEndsAt) : "—"},
            inclusive o Consultor de IA. Depois disso, sua conta volta ao plano gratuito.
          </p>
        </div>
      ) : null}

      {access.tier === "free" ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            No gratuito você já usa: {FREE_FEATURES.map((item) => FEATURE_LABEL[item]).join(" · ")}.
            Veículos, combustível, metas, compromissos, relatórios avançados, exportações e o
            Consultor de IA fazem parte dos planos pagos.
          </p>
          {access.trialUsed ? (
            <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              Você já usou seu período de teste. Assine para liberar tudo novamente — ou peça uma
              nova liberação ao administrador.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {TRIAL_OPTIONS.map((option) => (
                <Button
                  key={option.slug}
                  type="button"
                  size="sm"
                  variant={option.slug === "trial_7" ? "default" : "outline"}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(option.slug)}
                >
                  {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Testar {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
