import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";
import { openShareLink, type SharePayload } from "@/lib/share-links.functions";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const Route = createFileRoute("/compartilhado/$token")({
  head: () => ({
    meta: [
      { title: "Resumo financeiro compartilhado — GastoCerto" },
      {
        name: "description",
        content:
          "Visualização somente leitura de um resumo de gastos compartilhado com senha, sem necessidade de cadastro.",
      },
      { property: "og:title", content: "Resumo financeiro compartilhado — GastoCerto" },
      {
        property: "og:description",
        content: "Acesse com a senha recebida o resumo de gastos compartilhado no GastoCerto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedPage,
});

function SharedPage() {
  const { token } = Route.useParams();
  const open = useServerFn(openShareLink);
  const [password, setPassword] = useState("");
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await open({ data: { token, password } });
      if (result.ok) setPayload(result.payload);
      else setError(result.reason);
    } catch {
      setError("Não foi possível abrir o link agora.");
    } finally {
      setLoading(false);
    }
  };

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Lock className="size-5" aria-hidden />
            </div>
            <CardTitle className="text-center text-lg">Conteúdo protegido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Digite a senha recebida para ver o resumo. Não é necessário criar conta.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="share-access">Senha</Label>
                <Input
                  id="share-access"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="mt-1.5"
                  maxLength={64}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Compartilhado{payload.ownerName ? ` por ${payload.ownerName}` : ""} · somente leitura
        </p>
        <h1 className="text-2xl font-semibold">
          {payload.label ?? `Resumo de ${MONTHS[payload.month - 1]} de ${payload.year}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {MONTHS[payload.month - 1]} de {payload.year}
          {payload.expiresAt ? ` · link válido até ${formatDate(payload.expiresAt)}` : ""}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Receitas</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(payload.totals.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Despesas</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(payload.totals.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(payload.totals.balance)}</p>
          </CardContent>
        </Card>
      </section>

      {payload.categories.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Despesas por categoria
          </h2>
          <Card>
            <CardContent className="divide-y divide-border py-2">
              {payload.categories.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {payload.transactions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Lançamentos ({payload.totals.count})
          </h2>
          <Card>
            <CardContent className="divide-y divide-border py-2">
              {payload.transactions.map((item) => (
                <div key={item.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.date)}
                        {item.category ? ` · ${item.category}` : ""}
                        {item.merchant ? ` · ${item.merchant}` : ""}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                    <span
                      className={
                        item.type === "income"
                          ? "shrink-0 text-sm font-semibold text-primary"
                          : "shrink-0 text-sm font-semibold"
                      }
                    >
                      {item.type === "income" ? "+" : "−"} {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
