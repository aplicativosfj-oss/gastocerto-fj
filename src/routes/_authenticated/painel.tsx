import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, PiggyBank, Sparkles, Wallet } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useCategories, useProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — GastoCerto" },
      { name: "description", content: "Resumo dos seus gastos e receitas no GastoCerto." },
      { property: "og:title", content: "Painel — GastoCerto" },
      { property: "og:description", content: "Resumo dos seus gastos e receitas no GastoCerto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const { data: categories } = useCategories();

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, profile, navigate]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "por aqui";

  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Olá, {firstName}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua conta está pronta. Comece registrando seus lançamentos do mês.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Wallet className="size-5 text-primary" />}
            label="Renda mensal informada"
            value={
              profile?.monthly_income != null
                ? formatCurrency(Number(profile.monthly_income))
                : "Não informada"
            }
          />
          <StatCard
            icon={<PiggyBank className="size-5 text-primary" />}
            label="Categorias disponíveis"
            value={String(categories?.length ?? 0)}
          />
          <StatCard
            icon={<Sparkles className="size-5 text-primary" />}
            label="Situação da conta"
            value={profile?.status === "active" ? "Ativa" : (profile?.status ?? "—")}
          />
        </div>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Próximos passos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Os lançamentos, controle de combustível e relatórios chegam nas próximas etapas. Por
            enquanto, revise seu perfil e suas categorias.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/perfil">
                Ajustar meu perfil
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/onboarding">Revisar preferências</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Suas categorias</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(categories ?? []).map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {category.name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
