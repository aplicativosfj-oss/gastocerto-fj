import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Send } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiCreditsPanel } from "@/components/finance/ai-credits-panel";
import { AiReceipts } from "@/components/finance/ai-receipts";
import { EmblemAdvisor } from "@/components/ui/panel-emblems";
import { askAdvisor, getAdvisorAccess } from "@/lib/advisor.functions";

const TITLE = "Consultor de IA — GastoCerto";
const DESCRIPTION = "Análise inteligente dos seus gastos com dicas e decisões sugeridas.";

const SUGGESTIONS = [
  "Onde estou gastando mais e o que posso cortar neste mês?",
  "Meus gastos com veículo e combustível estão saudáveis?",
  "Como organizar meus compromissos e parcelas para sobrar dinheiro?",
  "Analise meu comportamento de consumo dos últimos 3 meses.",
  "Quanto eu deveria guardar por mês com base no meu histórico?",
];

export const Route = createFileRoute("/_authenticated/consultor")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdvisorPage,
});

type Turn = { role: "user" | "assistant"; content: string };

function AdvisorPage() {
  const ask = useServerFn(askAdvisor);
  const loadAccess = useServerFn(getAdvisorAccess);
  const queryClient = useQueryClient();
  const accessQuery = useQuery({
    queryKey: ["advisor-access"],
    queryFn: () => loadAccess({ data: undefined }),
    staleTime: 30_000,
  });
  const access = accessQuery.data;
  const locked = access ? !access.entitled : false;
  const [question, setQuestion] = useState("");
  const [months, setMonths] = useState(3);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [blocked, setBlocked] = useState(false);

  const mutation = useMutation({
    mutationFn: (value: string) => ask({ data: { question: value, months } }),
    onSuccess: (result, value) => {
      if (!result.entitled) setBlocked(true);
      if ("rateLimited" in result && result.rateLimited) {
        toast.warning(
          `Aguarde ${result.retryAfterSeconds}s antes da próxima análise (proteção contra tentativas repetidas).`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["advisor-access"] });
      setTurns((current) => [
        ...current,
        { role: "user", content: value },
        { role: "assistant", content: result.answer },
      ]);
    },
    onError: (error: Error) => {
      const message = error.message.includes("429")
        ? "Muitas consultas em sequência. Tente novamente em instantes."
        : error.message.includes("402")
          ? "Os créditos de IA acabaram. Fale com o administrador para liberar mais consultas."
          : (error.message || "Não foi possível consultar agora.");
      toast.error(message);
    },
  });

  function send(value: string) {
    const clean = value.trim();
    if (clean.length < 3) {
      toast.error("Escreva sua pergunta com mais detalhes.");
      return;
    }
    setQuestion("");
    mutation.mutate(clean);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <EmblemAdvisor title="Consultor de IA" className="size-11" />
            <div>
              <h1 className="page-title">Consultor de IA</h1>
              <p className="page-subtitle mt-1">
                Ele lê seus lançamentos, mapeia seus gastos e sugere decisões. Exclusivo para
                assinantes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 3, 6, 12].map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={months === value ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => setMonths(value)}
              >
                {value}m
              </Button>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Send className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Novo: Importação por Imagem</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agora você pode subir fotos de notas fiscais ou cupons. A IA vai ler os itens, 
                classificar automaticamente e ajudar você a entender seus gastos com alimentação 
                ou mercado de forma detalhada.
              </p>
              <div className="mt-2 text-[10px] font-medium text-primary uppercase tracking-wider">
                Disponível no Plano Premium IA
              </div>
            </div>
          </div>
        </section>


        {locked || blocked ? (
          <section
            role="alert"
            className="rounded-2xl border border-[oklch(0.75_0.15_75/0.4)] bg-[oklch(0.75_0.15_75/0.08)] p-4"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="size-4 text-[oklch(0.75_0.15_75)]" />
              Recurso exclusivo dos planos pagos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {access?.reason === "trial_plan"
                ? "Seu acesso atual é de teste (trial). Períodos de teste não usam a IA porque cada análise consome créditos."
                : "O plano gratuito não inclui o consultor de IA, pois cada análise consome créditos."}{" "}
              Ative sua assinatura para liberar a análise inteligente dos seus gastos.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/perfil">Fazer upgrade do plano</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/">Ver planos e preços</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {access ? (
          <AiCreditsPanel
            usage={access.usage}
            entitled={access.entitled}
            planSlug={access.planSlug}
          />
        ) : null}

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={mutation.isPending || locked}
                onClick={() => send(item)}
              >
                {item}
              </Button>
            ))}
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              send(question);
            }}
            noValidate
          >
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Pergunte algo sobre suas finanças…"
              aria-label="Pergunta para o consultor"
              className="flex-1"
            />
            <Button type="submit" disabled={mutation.isPending || locked} className="h-10">
              <Send className="size-4" />
              {mutation.isPending ? "Analisando…" : "Perguntar"}
            </Button>
          </form>
        </section>

        {turns.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Faça uma pergunta ou escolha uma sugestão para começar a análise.
          </p>
        ) : (
          <ul className="space-y-3">
            {turns.map((turn, index) => (
              <li
                key={`${turn.role}-${index}`}
                className={
                  turn.role === "user"
                    ? "rounded-2xl border border-border bg-muted/40 p-3 text-sm"
                    : "rounded-2xl border border-border bg-card p-4 text-sm"
                }
              >
                <Badge variant="secondary" className="mb-2">
                  {turn.role === "user" ? "Você" : "Consultor"}
                </Badge>
                {turn.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_li]:my-0.5">
                    <ReactMarkdown>{turn.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{turn.content}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {access ? <AiReceipts receipts={access.receipts} /> : null}
      </div>
    </AppShell>
  );
}
