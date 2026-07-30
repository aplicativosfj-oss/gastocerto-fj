import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateProfile, useProfile } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/validation";

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
  { value: "economizar", label: "Economizar mais todo mês" },
  { value: "sair_das_dividas", label: "Sair das dívidas" },
  { value: "organizar", label: "Organizar meus gastos" },
  { value: "investir", label: "Começar a investir" },
] as const;

const interests = [
  { value: "combustivel", label: "Controle de combustível" },
  { value: "gas", label: "Controle de gás de cozinha" },
  { value: "cartoes", label: "Cartões de crédito" },
  { value: "metas", label: "Metas de economia" },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const invalidateProfile = useInvalidateProfile();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [income, setIncome] = useState(
    profile?.monthly_income != null ? String(profile.monthly_income) : "",
  );
  const [goal, setGoal] = useState<string>("organizar");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function goNext() {
    setError(null);
    if (step === 0) {
      const clean = sanitizeText(fullName);
      if (clean.length < 3) {
        setError("Informe seu nome completo.");
        return;
      }
    }
    if (step === 1) {
      const parsed = Number(income.replace(",", "."));
      if (income !== "" && (Number.isNaN(parsed) || parsed < 0 || parsed > 100_000_000)) {
        setError("Informe um valor válido de renda mensal.");
        return;
      }
    }
    setStep((value) => Math.min(value + 1, 3));
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);

    const parsedIncome = income === "" ? null : Number(income.replace(",", "."));

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: sanitizeText(fullName),
        monthly_income: parsedIncome,
        onboarding_completed: true,
      })
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
        interests: selected,
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
    toast.success("Tudo pronto! Bem-vindo ao GastoCerto.");
    navigate({ to: "/painel", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex gap-2">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index <= step ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>

          {step === 0 ? (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Bem-vindo ao GastoCerto</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vamos personalizar sua experiência em poucos passos.
                </p>
              </div>
              <div>
                <Label htmlFor="fullName">Como podemos te chamar?</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1.5"
                  maxLength={100}
                />
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Qual sua renda mensal?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usamos essa informação apenas para calcular seus indicadores. É opcional.
                </p>
              </div>
              <div>
                <Label htmlFor="income">Renda mensal (R$)</Label>
                <Input
                  id="income"
                  inputMode="decimal"
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                  placeholder="3500,00"
                  className="mt-1.5 tabular-nums"
                />
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Qual seu principal objetivo?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Escolha o que mais importa hoje.</p>
              </div>
              <div className="grid gap-2">
                {goals.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setGoal(item.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                      goal === item.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">O que você quer acompanhar?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecione quantos quiser. Você pode mudar depois.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {interests.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleInterest(item.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                      selected.includes(item.value)
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

          <div className="mt-6 flex gap-2">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((value) => value - 1)}>
                Voltar
              </Button>
            ) : null}
            {step < 3 ? (
              <Button className="flex-1" onClick={goNext}>
                Continuar
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleFinish} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Concluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
