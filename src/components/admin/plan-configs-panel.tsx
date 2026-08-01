import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, RefreshCcw, Save, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { normalizePlanPrices, suggestedAnnual } from "@/lib/plan-pricing";

import { cn } from "@/lib/utils";
import {
  adminGetOwnContact,
  adminListPlans,
  adminUpdateOwnContact,
  adminUpdatePlan,
} from "@/lib/admin-plans.functions";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  active: boolean;
  trial_days: number | null;
};

type Draft = { monthly: string; annual: string; active: boolean };

function AdminContactCard() {
  const getContact = useServerFn(adminGetOwnContact);
  const saveContact = useServerFn(adminUpdateOwnContact);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "own-contact"],
    queryFn: () => getContact(),
  });

  const value = email ?? data?.contact_email ?? "";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  const mutation = useMutation({
    mutationFn: () => saveContact({ data: { contactEmail: value.trim() } }),
    onSuccess: () => {
      const saved = value.trim();
      toast.success(`E-mail de contato atualizado: ${saved}`, {
        description: "Já aparece no suporte e nas respostas institucionais.",
      });
      setEmail(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "own-contact"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível salvar"),
  });


  return (
    <Card className="border-brand/20 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Mail className="size-4 text-brand" /> E-mail de contato do administrador
        </CardTitle>
        <CardDescription className="text-xs">
          Endereço exibido no suporte e usado nas respostas institucionais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="admin-contact-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          E-mail
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="admin-contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="contato@seudominio.com"
            className="h-9 bg-background/60"
            disabled={isLoading}
            value={value}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            className="h-9 shrink-0 gap-2"
            disabled={mutation.isPending || !valid || value.trim() === (data?.contact_email ?? "")}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
        </div>
        {value && !valid ? (
          <p className="text-[11px] font-medium text-destructive">Informe um e-mail válido (ex.: nome@dominio.com).</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PlanConfigsPanel() {
  const queryClient = useQueryClient();
  const listPlans = useServerFn(adminListPlans);
  const updatePlan = useServerFn(adminUpdatePlan);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => listPlans(),
  });

  const plans = useMemo(() => ((data ?? []) as unknown as PlanRow[]), [data]);

  const mutation = useMutation({
    mutationFn: (vars: { id: string; monthlyPrice: number; annualPrice: number; active: boolean }) =>
      updatePlan({ data: vars }),
    onSuccess: (result, vars) => {
      const monthly = formatCurrency(Number(result?.monthlyPrice ?? vars.monthlyPrice));
      const annual = formatCurrency(Number(result?.annualPrice ?? vars.annualPrice));
      toast.success(`Plano atualizado: ${monthly}/mês · ${annual}/ano`, {
        description: "Os novos valores já valem no site, no checkout e nas licenças.",
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar plano"),
  });


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12">
        <Loader2 className="size-8 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">Carregando planos ativos...</p>
      </div>
    );
  }

  const draftFor = (plan: PlanRow): Draft =>
    drafts[plan.id] ?? {
      monthly: String(Number(plan.monthly_price).toFixed(2)),
      annual: String(Number(plan.annual_price).toFixed(2)),
      active: plan.active,
    };

  const setDraft = (plan: PlanRow, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [plan.id]: { ...draftFor(plan), ...patch } }));

  // Catálogo comercial: apenas Gratuito, Premium e Premium IA aparecem no site.
  const commercialPlans = plans.filter((p) => p.tier !== "trial");
  const trialPlans = plans.filter((p) => p.tier === "trial");
  const activeCount = commercialPlans.filter((p) => p.active).length;
  const paidCount = commercialPlans.filter((p) => p.active && Number(p.monthly_price) > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Tag className="size-4 text-brand" /> Planos ativos
            </CardTitle>
            <CardDescription className="text-xs">
              Catálogo comercial exibido no site: Gratuito, Premium e Premium IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground">ativos no site</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{paidCount}</p>
              <p className="text-[11px] text-muted-foreground">pagos</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{trialPlans.length}</p>
              <p className="text-[11px] text-muted-foreground">testes internos</p>
            </div>
          </CardContent>
        </Card>
        <AdminContactCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commercialPlans.map((plan) => {

          const draft = draftFor(plan);
          const monthly = Number(draft.monthly.replace(",", "."));
          const annual = Number(draft.annual.replace(",", "."));
          const validNumbers = Number.isFinite(monthly) && Number.isFinite(annual) && monthly >= 0 && annual >= 0;
          const preview = validNumbers
            ? normalizePlanPrices({ monthly, annual })
            : { monthly: 0, annual: 0, monthlyEquivalent: 0, savingsPercent: 0, savingsAmount: 0, adjusted: false };
          const changed =
            validNumbers &&
            (preview.monthly !== Number(plan.monthly_price) ||
              preview.annual !== Number(plan.annual_price) ||
              draft.active !== plan.active);
          const hasAi = plan.slug.includes("ia");
          const isTrial = plan.tier === "trial";


          return (
            <Card key={plan.id} className={cn("border-border/60 bg-card/50", plan.active && "border-brand/25")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase",
                      isTrial && "border-amber-500/40 bg-amber-500/5 text-amber-500",
                      hasAi && "border-brand/40 bg-brand/5 text-brand",
                    )}
                  >
                    {plan.slug}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {draft.active ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      aria-label={`Ativar plano ${plan.name}`}
                      checked={draft.active}
                      onCheckedChange={(v) => setDraft(plan, { active: v })}
                    />
                  </div>
                </div>
                <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                  {plan.name}
                  {hasAi ? <Sparkles className="size-4 text-brand" /> : null}
                </CardTitle>
                <CardDescription className="text-xs">
                  {plan.description ?? (isTrial ? "Plano de experimentação temporária" : "Assinatura recorrente")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Mensal (R$)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 bg-background/60"
                      value={draft.monthly}
                      onChange={(e) => setDraft(plan, { monthly: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Anual (R$)
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="h-9 bg-background/60"
                      value={draft.annual}
                      onChange={(e) => setDraft(plan, { annual: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Prévia para o cliente
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() =>
                      setDraft(plan, {
                        monthly: preview.monthly.toFixed(2),
                        annual: String(suggestedAnnual(preview.monthly)),
                      })
                    }
                  >
                    <RefreshCcw className="size-3" /> Arredondar
                  </Button>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Valor atual</span>
                    <span />
                    <span className="text-right">Novo valor</span>
                  </div>

                  <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <span className="tabular-nums text-sm text-muted-foreground line-through">
                      {Number(plan.monthly_price) > 0
                        ? `${formatCurrency(Number(plan.monthly_price))}/mês`
                        : "Gratuito"}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
                    <strong
                      className={cn(
                        "tabular-nums text-right text-base",
                        preview.monthly !== Number(plan.monthly_price) && "text-brand",
                      )}
                    >
                      {preview.monthly > 0 ? `${formatCurrency(preview.monthly)}/mês` : "Gratuito"}
                    </strong>
                  </div>

                  <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <span className="tabular-nums text-sm text-muted-foreground line-through">
                      {Number(plan.annual_price) > 0
                        ? `${formatCurrency(Number(plan.annual_price))}/ano`
                        : "Gratuito"}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
                    <strong
                      className={cn(
                        "tabular-nums text-right text-base",
                        preview.annual !== Number(plan.annual_price) && "text-brand",
                      )}
                    >
                      {preview.annual > 0 ? `${formatCurrency(preview.annual)}/ano` : "Gratuito"}
                    </strong>
                  </div>

                  {preview.annual > 0 ? (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Exibido como{" "}
                      <strong className="text-foreground">
                        {formatCurrency(preview.monthlyEquivalent)}/mês
                      </strong>{" "}
                      no anual · economia de {preview.savingsPercent}% (
                      {formatCurrency(preview.savingsAmount)}/ano)
                    </p>
                  ) : null}
                  {preview.adjusted ? (
                    <p className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600">
                      Valores serão salvos arredondados ({formatCurrency(preview.monthly)} ·{" "}
                      {formatCurrency(preview.annual)}) para o anual nunca exibir centavos quebrados.
                    </p>
                  ) : null}
                </div>

                <Button
                  className="h-9 w-full gap-2"
                  disabled={mutation.isPending || !changed}
                  onClick={() =>
                    mutation.mutate({
                      id: plan.id,
                      monthlyPrice: preview.monthly,
                      annualPrice: preview.annual,
                      active: draft.active,
                    })
                  }
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {saving ? "Aplicando..." : changed ? "Confirmar e salvar" : "Sem alterações"}
                </Button>

                {saving ? (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Aplicando os novos valores no site, checkout e licenças...
                  </p>
                ) : null}

              </CardContent>
            </Card>
          );
        })}
      </div>

      {trialPlans.length ? (
        <Card className="border-border/60 bg-card/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Tag className="size-4 text-amber-500" /> Planos de teste (uso interno)
            </CardTitle>
            <CardDescription className="text-xs">
              Não aparecem na página de preços nem no checkout. Servem apenas para conceder testes e
              cortesias pelo painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {trialPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{plan.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {plan.slug} · {plan.trial_days ?? 7} dias
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {plan.active ? "no site" : "interno"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>

  );
}
