import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, Save, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
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
      toast.success("E-mail de contato atualizado");
      setEmail(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "own-contact"] });
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
    onSuccess: (_r, vars) => {
      toast.success("Plano atualizado — os preços já valem no site e no checkout.");
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

  const activeCount = plans.filter((p) => p.active).length;
  const paidCount = plans.filter((p) => p.active && Number(p.monthly_price) > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Tag className="size-4 text-brand" /> Planos ativos
            </CardTitle>
            <CardDescription className="text-xs">Situação atual do catálogo comercial.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground">ativos</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{paidCount}</p>
              <p className="text-[11px] text-muted-foreground">pagos</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums">{plans.length - activeCount}</p>
              <p className="text-[11px] text-muted-foreground">inativos</p>
            </div>
          </CardContent>
        </Card>
        <AdminContactCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
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

                <p className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  Equivalente anual:{" "}
                  <strong className="text-foreground">
                    {annual > 0 ? `${formatCurrency(annual / 12)}/mês` : "gratuito"}
                  </strong>
                </p>

                <Button
                  className="h-9 w-full gap-2"
                  disabled={mutation.isPending || !changed}
                  onClick={() =>
                    mutation.mutate({
                      id: plan.id,
                      monthlyPrice: Number(monthly.toFixed(2)),
                      annualPrice: Number(annual.toFixed(2)),
                      active: draft.active,
                    })
                  }
                >
                  {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar alterações
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
