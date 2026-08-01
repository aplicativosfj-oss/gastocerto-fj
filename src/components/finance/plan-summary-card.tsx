import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Download, History, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmblemShield } from "@/components/ui/panel-emblems";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { usePlanAccess } from "@/hooks/use-plan";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { downloadLicenseReceipt } from "@/lib/license-receipt";
import { FEATURE_LABEL } from "@/lib/plan-features";
import { useProfile } from "@/lib/queries";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

const ACTION_LABEL: Record<string, string> = {
  grant_trial: "Teste gratuito concedido",
  plan_update: "Plano atualizado",
  license_activated: "Licença ativada",
  license_created: "Licença emitida",
  status_update: "Situação da conta alterada",
};

/** Última licença do usuário com o nome do plano. */
function useMyLicense() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-license", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select("*, plans(name, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Histórico de ajustes feitos na minha conta (auditoria visível ao titular). */
function useMyPlanAudit() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-plan-audit", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("id, action, details, created_at")
        .eq("target_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Resumo do plano do usuário: nível, validade, itens liberados, comprovante da
 * compra em PDF e histórico de ajustes na conta.
 */
export function PlanSummaryCard() {
  const plan = usePlanAccess();
  const license = useMyLicense();
  const audit = useMyPlanAudit();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  const access = plan.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = license.data as any;

  const planName =
    current?.plans?.name ??
    (access?.tier === "paid"
      ? access.aiIncluded
        ? "Premium IA"
        : "Premium"
      : access?.tier === "trial"
        ? "Teste gratuito"
        : "Gratuito");

  if (plan.isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <EmblemShield className="size-11" />
          <div>
            <h2 className="font-display text-base font-semibold">Resumo do meu plano</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="default">{planName}</Badge>
              {current?.status ? (
                <Badge variant={current.status === "active" ? "secondary" : "outline"}>
                  {STATUS_LABEL[current.status] ?? current.status}
                </Badge>
              ) : null}
              {access?.aiIncluded ? (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="size-3" aria-hidden />
                  Consultor de IA liberado
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {current?.expires_at
                ? `Validade até ${formatDateTime(current.expires_at)}`
                : access?.trialActive
                  ? `Teste ativo — restam ${access.trialDaysLeft} dia(s)`
                  : "Plano gratuito, sem data de expiração."}
              {current?.amount ? ` · pago ${formatCurrency(Number(current.amount))}` : ""}
              {current?.billing_cycle === "annual" ? " · assinatura anual" : ""}
            </p>
          </div>
        </div>

        {current ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadLicenseReceipt({
                licenseKey: current.license_key,
                planName,
                billingCycle: current.billing_cycle ?? "monthly",
                amount: Number(current.amount ?? 0),
                status: STATUS_LABEL[current.status] ?? String(current.status ?? "—"),
                issuedAt: current.issued_at ?? null,
                activatedAt: current.activated_at ?? null,
                expiresAt: current.expires_at ?? null,
                holderName: profile?.full_name ?? current.full_name ?? null,
                cpf: profile?.cpf ?? current.cpf ?? null,
                email: current.email ?? user?.email ?? null,
                aiIncluded: Boolean(access?.aiIncluded),
              })
            }
          >
            <Download className="size-4" />
            Baixar comprovante
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Itens liberados no seu plano
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {(access?.features ?? []).map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
            >
              <BadgeCheck className="size-3.5 text-primary" aria-hidden />
              {FEATURE_LABEL[feature]}
            </li>
          ))}
        </ul>
        {access?.locked?.length ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Bloqueados: {access.locked.map((feature) => FEATURE_LABEL[feature]).join(", ")}
          </p>
        ) : null}
      </div>

      {audit.data?.length ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            Histórico de ajustes na minha conta
          </h3>
          <ul className="mt-2 space-y-2 text-sm">
            {audit.data.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(entry.created_at)}
                </span>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(entry.details as any)?.plan_slug ? (
                  <Badge variant="outline" className="text-xs">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(entry.details as any).plan_slug}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
