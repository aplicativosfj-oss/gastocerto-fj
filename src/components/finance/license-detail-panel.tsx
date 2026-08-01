import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Download,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { CheckoutDialog } from "@/components/landing/checkout-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

const TIER_LABEL: Record<string, string> = {
  free: "Gratuito",
  trial: "Em teste",
  paid: "Assinante",
};

/** Todas as licenças do usuário, mais recente primeiro. */
function useMyLicenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-licenses", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select("*, plans(name, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/**
 * Painel detalhado do plano e das licenças: situação atual, validade, recursos
 * liberados, histórico de licenças, comprovantes e ação de upgrade.
 */
export function LicenseDetailPanel() {
  const plan = usePlanAccess();
  const licenses = useMyLicenses();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState(false);

  const access = plan.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = (licenses.data ?? []) as any[];
  const current = list[0];

  if (plan.isLoading) return <Skeleton className="h-56 rounded-2xl" />;

  const planName =
    current?.plans?.name ??
    (access?.tier === "paid"
      ? access.aiIncluded
        ? "Premium IA"
        : "Premium"
      : access?.tier === "trial"
        ? "Teste gratuito"
        : "Gratuito");

  const remaining = daysUntil(current?.expires_at ?? access?.trialEndsAt ?? null);
  const canUpgrade = access?.tier !== "paid" || !access?.aiIncluded;

  return (
    <section className="accent-tile space-y-3 rounded-2xl p-4 shadow-soft sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-wider">Plano e licenças</h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge className="text-[10px]">{planName}</Badge>
              <Badge variant="outline" className="text-[10px]">
                {TIER_LABEL[access?.tier ?? "free"]}
              </Badge>
              {current?.status ? (
                <Badge
                  variant={current.status === "active" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {STATUS_LABEL[current.status] ?? current.status}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        {canUpgrade ? (
          <Button size="sm" className="h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider" onClick={() => setCheckout(true)}>
            Fazer upgrade
            <ArrowUpRight className="ml-1 size-3.5" aria-hidden />
          </Button>
        ) : null}
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Validade
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold tabular-nums">
            {current?.expires_at
              ? formatDateTime(current.expires_at)
              : access?.trialEndsAt
                ? formatDateTime(access.trialEndsAt)
                : "Sem expiração"}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Tempo restante
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold tabular-nums">
            <CalendarClock className="size-3 text-muted-foreground" aria-hidden />
            {remaining == null ? "—" : remaining > 0 ? `${remaining} dia(s)` : "Encerrado"}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Consultor de IA
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {access?.aiIncluded ? "Liberado" : "Bloqueado no plano atual"}
          </p>
        </div>
      </div>

      {access?.tier === "trial" && access.trialDaysLeft > 0 ? (
        <Progress
          value={Math.min(100, Math.max(0, 100 - access.trialDaysLeft * 10))}
          className="h-1.5"
          aria-label="Progresso do período de teste"
        />
      ) : null}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Recursos liberados
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {(access?.features ?? []).map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[11px]"
            >
              <BadgeCheck className="size-3 text-primary" aria-hidden />
              {FEATURE_LABEL[feature]}
            </li>
          ))}
        </ul>
        {access?.locked?.length ? (
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Bloqueados: {access.locked.map((feature) => FEATURE_LABEL[feature]).join(" · ")}
          </p>
        ) : null}
      </div>

      {list.length ? (
        <div className="border-t border-border/40 pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            <KeyRound className="size-3" aria-hidden /> Minhas licenças
          </p>
          <ul className="mt-2 space-y-1.5">
            {list.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] font-semibold">{item.license_key}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.plans?.name ?? "—"}
                    {item.amount ? ` · ${formatCurrency(Number(item.amount))}` : ""}
                    {item.expires_at ? ` · até ${formatDateTime(item.expires_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={item.status === "active" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() =>
                      downloadLicenseReceipt({
                        licenseKey: item.license_key,
                        planName: item.plans?.name ?? planName,
                        billingCycle: item.billing_cycle ?? "monthly",
                        amount: Number(item.amount ?? 0),
                        status: STATUS_LABEL[item.status] ?? String(item.status ?? "—"),
                        issuedAt: item.issued_at ?? null,
                        activatedAt: item.activated_at ?? null,
                        expiresAt: item.expires_at ?? null,
                        holderName: profile?.full_name ?? null,
                        cpf: profile?.cpf ?? null,
                        email: item.email ?? user?.email ?? null,
                        aiIncluded: Boolean(access?.aiIncluded),
                      })
                    }
                  >
                    <Download className="mr-1 size-3" aria-hidden />
                    Recibo
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CheckoutDialog open={checkout} onOpenChange={setCheckout} />
    </section>
  );
}
