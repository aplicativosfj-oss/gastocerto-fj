import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Undo2, Zap, ZapOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmblemGauge } from "@/components/ui/panel-emblems";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_AI_LIMITS, AiLimitsSchema, type AiLimits } from "@/lib/ai-limits";
import { getAiLimits, saveAiLimits } from "@/lib/settings.functions";

type FieldKey = keyof AiLimits;

const FIELDS: {
  key: FieldKey;
  label: string;
  hint: string;
  step?: string;
  group: "rate" | "quota";
}[] = [
  {
    key: "rateMaxInWindow",
    label: "Tentativas por janela curta",
    hint: "Máximo de análises que um usuário pode pedir na janela curta.",
    group: "rate",
  },
  {
    key: "rateWindowSeconds",
    label: "Janela curta (segundos)",
    hint: "Duração da janela curta de rate limiting.",
    group: "rate",
  },
  {
    key: "rateMaxInBurstWindow",
    label: "Tentativas por janela longa",
    hint: "Teto de tentativas na janela longa (proteção anti-abuso).",
    group: "rate",
  },
  {
    key: "burstWindowSeconds",
    label: "Janela longa (segundos)",
    hint: "Duração da janela longa. Padrão: 3600 (1 hora).",
    group: "rate",
  },
  {
    key: "monthlyQueryLimit",
    label: "Consultas por mês",
    hint: "Cota mensal de análises por assinante.",
    group: "quota",
  },
  {
    key: "monthlyCreditAllowance",
    label: "Créditos por mês",
    hint: "Créditos estimados permitidos por mês.",
    step: "0.5",
    group: "quota",
  },
  {
    key: "lowCreditRatio",
    label: "Alerta de créditos (fração restante)",
    hint: "0.2 = avisa quando restarem 20% dos créditos ou consultas.",
    step: "0.01",
    group: "quota",
  },
];

export function AiSettingsPanel() {
  const load = useServerFn(getAiLimits);
  const save = useServerFn(saveAiLimits);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-limits"],
    queryFn: () => load({ data: undefined }),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<Record<FieldKey, string>>(() =>
    Object.fromEntries(
      Object.entries(DEFAULT_AI_LIMITS).map(([key, value]) => [key, String(value)]),
    ) as Record<FieldKey, string>,
  );

  useEffect(() => {
    if (!query.data) return;
    setForm(
      Object.fromEntries(
        Object.entries(query.data).map(([key, value]) => [key, String(value)]),
      ) as Record<FieldKey, string>,
    );
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (values: AiLimits) => save({ data: values }),
    onSuccess: () => {
      toast.success("Limites da IA atualizados.");
      void queryClient.invalidateQueries({ queryKey: ["ai-limits"] });
      void queryClient.invalidateQueries({ queryKey: ["advisor-access"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = AiLimitsSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Revise os valores: algum limite está fora da faixa permitida.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <EmblemGauge title="Limites do Consultor de IA" />
          <div>
            <h2 className="text-sm font-semibold">Limites do Consultor de IA</h2>
            <p className="text-xs text-muted-foreground">
              Rate limiting por usuário, cota mensal e threshold do alerta de créditos. Vale para
              todos os assinantes imediatamente.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() =>
            setForm(
              Object.fromEntries(
                Object.entries(DEFAULT_AI_LIMITS).map(([key, value]) => [key, String(value)]),
              ) as Record<FieldKey, string>,
            )
          }
        >
          <Undo2 className="size-3.5" />
          Restaurar padrões
        </Button>
      </header>

      <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              {form.economyMode === "true" ? <ZapOff className="size-5" /> : <Zap className="size-5" />}
            </div>
            <div>
              <Label className="text-sm font-semibold">Modo Econômico Lovable (Gemini)</Label>
              <p className="text-xs text-muted-foreground">
                Quando ativo, as respostas da IA serão mais curtas e diretas, economizando tokens e créditos mensais dos assinantes.
              </p>
            </div>
          </div>
          <Switch
            checked={form.economyMode === "true"}
            onCheckedChange={(checked) => setForm(f => ({ ...f, economyMode: String(checked) }))}
          />
        </div>

        {(["rate", "quota"] as const).map((group) => (
          <fieldset key={group} className="rounded-xl border border-border/70 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group === "rate" ? "Rate limiting" : "Cota e alertas de crédito"}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.filter((field) => field.group === group).map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`ai-${field.key}`} className="text-xs">
                    {field.label}
                  </Label>
                  <Input
                    id={`ai-${field.key}`}
                    type="number"
                    inputMode="decimal"
                    step={field.step ?? "1"}
                    min="0"
                    value={form[field.key]}
                    disabled={query.isLoading}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">{field.hint}</p>
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar limites
        </Button>
      </form>
    </section>
  );
}
