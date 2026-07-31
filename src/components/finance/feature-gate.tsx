import { Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useFeature } from "@/hooks/use-plan";
import { FEATURE_LABEL, type FeatureKey } from "@/lib/plan-features";

/**
 * Bloqueio visual de recursos premium: no plano gratuito o usuário vê o recurso
 * e é convidado a testar 7/15/30 dias ou assinar.
 */
export function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) {
  const { enabled, isLoading } = useFeature(feature);
  if (isLoading || enabled) return <>{children}</>;

  return (
    <section
      role="alert"
      className="rounded-2xl border border-[oklch(0.75_0.15_75/0.4)] bg-[oklch(0.75_0.15_75/0.08)] p-5 text-center"
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[oklch(0.75_0.15_75/0.15)]">
        <Lock className="size-5 text-[oklch(0.75_0.15_75)]" aria-hidden />
      </div>
      <h2 className="mt-3 font-display text-base font-semibold">
        {FEATURE_LABEL[feature]} é um recurso premium
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        O plano gratuito libera lançamentos, categorias e o painel do mês. Ative um teste com{" "}
        <strong>tudo liberado</strong> por 7, 15 ou 30 dias — sem pagar nada agora.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild size="sm">
          <Link to="/perfil">
            <Sparkles className="size-4" />
            Ativar teste gratuito
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/">Ver planos</Link>
        </Button>
      </div>
    </section>
  );
}
