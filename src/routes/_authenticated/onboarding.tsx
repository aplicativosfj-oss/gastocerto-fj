import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Target, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateProfile, useProfile } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — GastoCerto" },
      {
        name: "description",
        content: "Personalize o GastoCerto com sua renda, objetivo e preferências.",
      },
      { property: "og:title", content: "Configuração inicial — GastoCerto" },
      {
        property: "og:description",
        content: "Personalize o GastoCerto com sua renda, objetivo e preferências.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const goals = [
  { value: "economizar", label: "Economizar mais", hint: "Sobrar dinheiro todo mês" },
  { value: "sair_das_dividas", label: "Sair das dívidas", hint: "Reduzir parcelas e juros" },
  { value: "organizar", label: "Organizar gastos", hint: "Saber para onde vai o dinheiro" },
  { value: "investir", label: "Começar a investir", hint: "Construir reserva e patrimônio" },
] as const;

const interests = [
  { value: "combustivel", label: "Combustível", hint: "Consumo e custo por km" },
  { value: "gas", label: "Gás de cozinha", hint: "Previsão de troca do botijão" },
  { value: "cartoes", label: "Cartões de crédito", hint: "Faturas e parcelas" },
  { value: "metas", label: "Metas de economia", hint: "Orçamentos por categoria" },
] as const;

const STEPS = [
  { title: "Sua renda", eyebrow: "Passo 1 de 3", icon: Wallet },
  { title: "Seu objetivo", eyebrow: "Passo 2 de 3", icon: Target },
  { title: "O que acompanhar", eyebrow: "Passo 3 de 3", icon: Sparkles },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const invalidateProfile = useInvalidateProfile();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [income, setIncome] = useState(
    profile?.monthly_income != null ? String(profile.monthly_income) : "",
  );
  const [goal, setGoal] = useState<string>("organizar");
  const [selected, setSelected] = useState<string[]>(["combustivel"]);
  const [error, setError] = useState<string | null>(null);

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];

  function toggleInterest(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function goNext() {
    setError(null);
    if (step === 0) {
      const parsed = Number(income.replace(",", "."));
      if (income !== "" && (Number.isNaN(parsed) || parsed < 0 || parsed > 100_000_000)) {
        setError("Informe um valor válido de renda mensal.");
        return;
      }
    }
    setStep((value) => Math.min(value + 1, 2));
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);

    const parsedIncome = income === "" ? null : Number(income.replace(",", "."));

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ monthly_income: parsedIncome, onboarding_completed: true })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("[onboarding] falha ao salvar perfil", profileError.message);
      setSaving(false);
      toast.error("Não foi possível salvar suas informações. Tente novamente.");
      return;
    }

    const { error: prefsError } = await supabase.from("onboarding_preferences").upsert(
      {
        user_id: user.id,
        main_goal: goal,
        monthly_income: parsedIncome,
        used_categories: selected,
        track_fuel: selected.includes("combustivel"),
        track_gas_cylinder: selected.includes("gas"),
        has_vehicle: selected.includes("combustivel"),
      },
      { onConflict: "user_id" },
    );

    setSaving(false);

    if (prefsError) {
      console.error("[onboarding] falha ao salvar preferências", prefsError.message);
      toast.error("Não foi possível salvar suas preferências. Tente novamente.");
      return;
    }

    await invalidateProfile();
    toast.success("Configuração concluída. Bom controle!");
    navigate({ to: "/painel", replace: true });
  }

  const current = STEPS[step];
  const StepIcon = current.icon;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_70%)]"
      />
      <div className="relative w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border bg-secondary/30 px-5 py-4 sm:px-7">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                <StepIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                  {current.eyebrow}
                </p>
                <h1 className="truncate font-display text-lg font-bold leading-tight sm:text-xl">
                  {step === 0 && firstName ? `Vamos começar, ${firstName}` : current.title}
                </h1>
              </div>
            </div>
            <div className="mt-4 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>
              {STEPS.map((item, index) => (
                <span
                  key={item.title}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    index <= step ? "bg-brand" : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7">
            {step === 0 ? (
              <section className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Usamos sua renda apenas para calcular indicadores e alertas. É opcional e você
                  pode alterar depois.
                </p>
                <div>
                  <Label htmlFor="income">Renda mensal (R$)</Label>
                  <MoneyInput
                    id="income"
                    value={income}
                    onValueChange={setIncome}
                    placeholder="3.500,00"
                    className="mt-1.5 h-12 text-base"
                  />
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Escolha o que mais importa hoje para ajustarmos suas recomendações.
                </p>
                <div className="grid gap-2">
                  {goals.map((item) => {
                    const active = goal === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setGoal(item.value)}
                        className={cn(
                          "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                          active
                            ? "border-brand/50 bg-brand/10 shadow-soft"
                            : "border-border hover:border-brand/30 hover:bg-secondary/60",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">{item.hint}</span>
                        </span>
                        {active ? (
                          <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selecione quantos quiser. Isso só organiza seus atalhos — nada fica bloqueado.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {interests.map((item) => {
                    const active = selected.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleInterest(item.value)}
                        className={cn(
                          "flex min-h-14 items-start justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all",
                          active
                            ? "border-brand/50 bg-brand/10 shadow-soft"
                            : "border-border hover:border-brand/30 hover:bg-secondary/60",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">{item.hint}</span>
                        </span>
                        {active ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              {step > 0 ? (
                <Button
                  variant="outline"
                  className="min-h-11 sm:min-h-10"
                  onClick={() => setStep((value) => value - 1)}
                >
                  <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                  Voltar
                </Button>
              ) : null}
              {step < 2 ? (
                <Button className="min-h-11 flex-1 sm:min-h-10" onClick={goNext}>
                  Continuar
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  className="min-h-11 flex-1 sm:min-h-10"
                  onClick={handleFinish}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Concluir configuração
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <button
            type="button"
            className="font-semibold text-brand underline-offset-4 hover:underline"
            onClick={handleFinish}
            disabled={saving}
          >
            Pular e ir direto ao painel
          </button>
        </p>
      </div>
    </main>
  );
}
