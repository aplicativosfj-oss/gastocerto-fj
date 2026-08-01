import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetPlanConfigs, adminUpdatePlanConfig } from "@/lib/admin-expansion.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PlanConfigsPanel() {
  const queryClient = useQueryClient();
  const getConfigs = useServerFn(adminGetPlanConfigs);
  const updateConfig = useServerFn(adminUpdatePlanConfig);
  const [editing, setEditing] = useState<Record<string, number>>({});

  const { data: configs, isLoading } = useQuery({
    queryKey: ["admin", "plan-configs"],
    queryFn: () => getConfigs(),
  });

  const mutation = useMutation({
    mutationFn: (variables: { id: string; price: number }) =>
      updateConfig({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plan-configs"] });
      toast.success("Plano atualizado com sucesso");
      setEditing({});
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar"),
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <Loader2 className="size-8 animate-spin text-brand" />
      <p className="text-sm text-muted-foreground">Carregando configurações de planos...</p>
    </div>
  );

  const planList = (configs || []) as any[];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {planList.map((plan) => {
          const isTrial = plan.plan_id.toLowerCase().includes("trial");
          const hasAi = plan.plan_id.toLowerCase().includes("ia") || plan.plan_id === "premium_plus";
          
          return (
            <Card key={plan.id} className="relative overflow-hidden border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={isTrial ? "outline" : "default"} className={cn(
                    "mb-2",
                    isTrial && "border-amber-500/50 text-amber-500 bg-amber-500/5",
                    hasAi && "border-brand/50 text-brand bg-brand/5"
                  )}>
                    {plan.plan_id.replace('_ia', ' + IA').toUpperCase()}
                  </Badge>
                  {hasAi && <Sparkles className="size-4 text-brand" />}
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">
                  {isTrial ? "Plano de experimentação temporária" : "Assinatura recorrente"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Preço Mensal (R$)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9 bg-background/50"
                      value={editing[plan.id] ?? plan.price}
                      onChange={(e) => setEditing({ ...editing, [plan.id]: parseFloat(e.target.value) })}
                    />
                    <Button
                      size="icon"
                      className="size-9 shrink-0 bg-brand text-brand-foreground hover:bg-brand/90"
                      disabled={mutation.isPending || editing[plan.id] === undefined || editing[plan.id] === plan.price}
                      onClick={() => mutation.mutate({ id: plan.id, price: editing[plan.id] })}
                    >
                      {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="size-3 text-brand" />
                    <span>IA: {hasAi ? "Habilitado" : "Desabilitado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="size-3 text-brand" />
                    <span>Suporte: {isTrial ? "Básico" : "Prioritário"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand">Diferenciação Premium</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O sistema utiliza o <code className="rounded bg-brand/10 px-1 text-brand">plan-features.ts</code> para restringir recursos. 
              Planos sem o sufixo IA são bloqueados automaticamente no Advisor. Certifique-se de ajustar os preços 
              refletindo o valor dos créditos de IA consumidos (<strong>Premium: R$ 24,90</strong> | <strong>Premium + IA: R$ 34,90</strong>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}