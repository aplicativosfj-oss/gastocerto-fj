import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Copy, KeyRound, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrderStatus } from "@/lib/checkout.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Acompanhar pedido | GastoCerto" },
      {
        name: "description",
        content:
          "Acompanhe o pagamento do seu plano GastoCerto: situação do Pix, confirmação e entrega da chave de ativação.",
      },
      { property: "og:title", content: "Acompanhar pedido | GastoCerto" },
      {
        property: "og:description",
        content: "Situação do Pix, confirmação do pagamento e entrega da chave de ativação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderStatusPage,
});

const STEPS = [
  { key: "pending", label: "Pagamento pendente", icon: Clock },
  { key: "paid", label: "Pagamento confirmado", icon: CheckCircle2 },
  { key: "delivered", label: "Chave entregue", icon: KeyRound },
] as const;

function OrderStatusPage() {
  const { id } = Route.useParams();

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderStatus({ data: { paymentId: id } }),
    refetchInterval: (q) => (q.state.data?.approved ? false : 15000),
  });

  const order = query.data;
  const stage = !order ? 0 : order.approved ? (order.licenseKey ? 3 : 2) : 1;

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo className="h-8 w-auto" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            )}
            Atualizar
          </Button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight">Status do Pagamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o status do seu pagamento e a entrega da chave (Pendente, Pago e Entregue).

            Esta página atualiza sozinha a cada 15 segundos até o Pix ser confirmado.
          </p>

          {query.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Carregando pedido…</p>
          ) : query.isError ? (
            <p className="mt-6 text-sm text-expense">
              {query.error instanceof Error
                ? query.error.message
                : "Não localizamos este pedido."}
            </p>
          ) : order ? (
            <>
              <ol className="mt-5 space-y-2">
                {STEPS.map((step, index) => {
                  const done = stage > index + 1;
                  const active = stage === index + 1;
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.key}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                        done && "border-income/40 bg-income/10 text-income",
                        active && "border-primary bg-primary/5 font-semibold",
                        !done && !active && "border-border text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{step.label}</span>
                      {done ? (
                        <Badge variant="secondary" className="ml-auto">
                          Concluído
                        </Badge>
                      ) : active ? (
                        <Badge className="ml-auto">Em andamento</Badge>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Plano
                  </dt>
                  <dd className="font-semibold">
                    {order.planName} · {order.cycle === "annual" ? "Anual" : "Mensal"}
                  </dd>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Valor
                  </dt>
                  <dd className="tabular font-semibold">{formatCurrency(order.amount)}</dd>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Criado em
                  </dt>
                  <dd>{formatDateTime(order.createdAt)}</dd>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    E-mail do pedido
                  </dt>
                  <dd>{order.emailMasked ?? "—"}</dd>
                </div>
              </dl>

              {order.licenseKey ? (
                <div className="mt-4 rounded-xl border border-income/40 bg-income/10 p-4">
                  <p className="text-sm font-semibold text-income">
                    Pagamento confirmado — sua chave de ativação está pronta
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-card px-3 py-2 font-mono text-base font-bold tracking-wider">
                      {order.licenseKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(order.licenseKey!);
                        toast.success("Chave copiada.");
                      }}
                    >
                      <Copy className="mr-2 size-4" aria-hidden="true" />
                      Copiar
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/auth">Ativar minha conta</Link>
                    </Button>
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                    <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {order.deliveredByEmail
                      ? "Também enviamos a chave para o e-mail do pedido."
                      : "Guarde esta chave: o envio automático por e-mail ainda não está disponível, então esta página é o seu comprovante de entrega."}
                  </p>
                </div>
              ) : order.qrCodeBase64 || order.qrCode ? (
                <div className="mt-4 rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">Pague com Pix para liberar sua chave</p>
                  {order.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${order.qrCodeBase64}`}
                      alt="QR Code do Pix para pagamento do plano"
                      className="mt-3 size-44 rounded-lg border border-border bg-card p-2"
                    />
                  ) : null}
                  {order.qrCode ? (
                    <Button
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(order.qrCode!);
                        toast.success("Código Pix copiado.");
                      }}
                    >
                      <Copy className="mr-2 size-4" aria-hidden="true" />
                      Copiar código Pix
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {order.timeline.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Histórico
                  </p>
                  <ul className="space-y-1">
                    {order.timeline.map((item, index) => (
                      <li
                        key={`${item.at}-${index}`}
                        className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-1 text-xs text-muted-foreground last:border-0"
                      >
                        <span className="text-foreground">{item.label}</span>
                        <span>{formatDateTime(item.at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas sobre o pagamento? Fale com o suporte pelo site.
        </p>
      </div>
    </main>
  );
}
