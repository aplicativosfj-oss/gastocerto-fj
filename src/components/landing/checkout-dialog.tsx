import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { PENDING_LICENSE_KEY } from "@/components/landing/code-access-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmCheckoutVerification,
  getCheckoutStatus,
  getManualPaymentInstructions,
  requestCheckoutVerification,
  startManualOrder,
} from "@/lib/checkout.functions";

import {
  CHECKOUT_PLANS,
  CHECKOUT_STATUS_LABEL,
  checkoutPrice,
  type CheckoutCycle,
  type CheckoutPlan,
} from "@/lib/checkout";
import { maskCpf } from "@/lib/cpf";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { livePrice, usePublicPlans } from "@/hooks/use-public-plans";

type Step = "plan" | "form" | "code" | "manual" | "done";

type Order = Awaited<ReturnType<typeof startManualOrder>>;
type Verification = Awaited<ReturnType<typeof requestCheckoutVerification>>;



export function CheckoutDialog({
  open,
  onOpenChange,
  initialPlan,
  initialCycle = "annual",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlan?: CheckoutPlan["slug"];
  initialCycle?: CheckoutCycle;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("plan");
  const [planSlug, setPlanSlug] = useState<CheckoutPlan["slug"]>(initialPlan ?? "premium_ia");
  const [cycle, setCycle] = useState<CheckoutCycle>(initialCycle);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState("pending");
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [code, setCode] = useState("");
  const pollRef = useRef<number | null>(null);

  const { data: livePlans } = usePublicPlans();

  // Dados de Pix/transferência que o administrador mantém no painel.
  const { data: manual } = useQuery({
    queryKey: ["manual-payment-instructions"],
    queryFn: () => getManualPaymentInstructions(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Catálogo com os preços vigentes do banco (ajustes do admin valem na hora).
  const catalog = CHECKOUT_PLANS.map((item) => {
    const live = livePrice(livePlans, item.slug, { monthly: item.monthly, annual: item.annual });
    return { ...item, monthly: live.monthly, annual: live.annual };
  });

  const plan = catalog.find((item) => item.slug === planSlug) ?? catalog[0];
  const price = checkoutPrice(plan, cycle);

  useEffect(() => {
    if (!open) return;
    setStep(initialPlan ? "form" : "plan");
    setPlanSlug(initialPlan ?? "premium_ia");
    setCycle(initialCycle);
    setOrder(null);
    setLicenseKey(null);
    setStatus("pending");
    setVerification(null);
    setCode("");
  }, [open, initialPlan, initialCycle]);

  // Enquanto o pedido está aberto, verificamos a cada 15s se o administrador
  // já confirmou o recebimento e liberou a chave.
  useEffect(() => {
    if (step !== "manual" || !order) return;
    const check = async () => {
      try {
        const result = await getCheckoutStatus({ data: { paymentId: order.paymentId } });
        setStatus(result.status);
        if (result.status === "approved" && result.licenseKey) {
          setLicenseKey(result.licenseKey);
          setStep("done");
        }
      } catch {
        /* tentaremos novamente no próximo ciclo */
      }
    };
    void check();
    pollRef.current = window.setInterval(check, 15000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [step, order]);

  // Etapa 1: envia o código para o e-mail. Nenhum cadastro é criado ainda.
  const verify = useMutation({
    mutationFn: () =>
      requestCheckoutVerification({ data: { planSlug, cycle, fullName, email, cpf } }),
    onSuccess: (result) => {
      setVerification(result);
      setCode("");
      setStep("code");
      toast.success(
        result.emailDelivered
          ? `Código enviado para ${result.email}.`
          : "Código gerado. O envio por e-mail depende do domínio remetente configurado.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o código."),
  });

  const create = useMutation({
    mutationFn: () =>
      startManualOrder({
        data: {
          planSlug: planSlug as "premium" | "premium_ia",
          cycle,
          fullName,
          email,
          cpf,
          verificationId: verification?.verificationId ?? "",
        },
      }),
    onSuccess: (result) => {
      setOrder(result);
      setStatus(result.status);
      setStep("manual");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o pedido."),
  });


  // Etapa 2: confirma o código e só então segue para a cobrança.
  const confirm = useMutation({
    mutationFn: () =>
      confirmCheckoutVerification({
        data: { verificationId: verification?.verificationId ?? "", code: code.trim() },
      }),
    onSuccess: () => {
      if (price > 0) {
        toast.success("E-mail confirmado. Gerando seu Pix...");
        create.mutate();
      } else {
        toast.success("E-mail confirmado. Liberando seu acesso gratuito...");
        setStep("done");
        // No gratuito a chave é liberada "virtualmente" como PENDING para o /auth
        setLicenseKey(PENDING_LICENSE_KEY);
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Código inválido."),
  });


  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("Copie manualmente o texto exibido.");
    }
  };

  const activateNow = () => {
    if (!licenseKey) return;
    try {
      sessionStorage.setItem(PENDING_LICENSE_KEY, licenseKey);
    } catch {
      /* ignorado */
    }
    onOpenChange(false);
    navigate({ to: "/auth", search: { mode: "signup" } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
            {step === "done" ? "Pagamento confirmado" : "Assinar o GastoCerto"}
          </DialogTitle>
          <DialogDescription>
            {step === "plan"
              ? "Escolha o plano e o ciclo de cobrança."
              : step === "form"
                ? "Informe seus dados: enviaremos um código para confirmar seu e-mail."
                : step === "code"
                  ? "Digite o código de 6 dígitos enviado ao seu e-mail."
                  : step === "pix"
                    ? "Pague o Pix e a chave de ativação é liberada automaticamente."
                    : "Sua chave de ativação está pronta."}
          </DialogDescription>

        </DialogHeader>

        {step === "plan" ? (
          <div className="space-y-3">
            <div
              role="group"
              aria-label="Ciclo de cobrança"
              className="inline-flex rounded-full border border-border bg-secondary/40 p-1"
            >
              {([
                { key: "monthly" as const, label: "Mensal" },
                { key: "annual" as const, label: "Anual" },
              ]).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={cycle === option.key}
                  onClick={() => setCycle(option.key)}
                  className={cn(
                    "min-h-9 rounded-full px-4 text-xs font-semibold transition-colors",
                    cycle === option.key
                      ? "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              {catalog.map((item) => {
                const selected = item.slug === planSlug;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setPlanSlug(item.slug)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      selected
                        ? "border-brand ring-1 ring-brand/40 bg-brand/5"
                        : "border-border hover:border-brand/40",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {item.name}
                        {item.recommended ? (
                          <Badge className="gap-1 bg-brand text-brand-foreground">
                            <Sparkles className="size-3" aria-hidden="true" /> Mais completo
                          </Badge>
                        ) : null}
                      </span>
                      <span className="tabular text-lg font-extrabold">
                        {formatCurrency(checkoutPrice(item, cycle))}
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                          {cycle === "annual" ? "/ano" : "/mês"}
                        </span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.tagline}</p>
                  </button>
                );
              })}
            </div>

            <ul className="grid gap-1 rounded-xl border border-border bg-secondary/30 p-3">
              {plan.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-[13px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-muted-foreground">{highlight}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full" onClick={() => setStep("form")}>
              Continuar — {formatCurrency(price)}
            </Button>
          </div>
        ) : null}

        {step === "form" ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              verify.mutate();
            }}
          >

            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm">
              <span className="font-semibold">{plan.name}</span> ·{" "}
              {cycle === "annual" ? "cobrança anual" : "cobrança mensal"} ·{" "}
              <span className="tabular font-semibold">{formatCurrency(price)}</span>
            </div>
            <div>
              <Label htmlFor="checkout-name">Nome completo</Label>
              <Input
                id="checkout-name"
                required
                minLength={3}
                autoComplete="name"
                className="mt-1.5"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="checkout-email">E-mail para receber o código e a chave</Label>
              <Input
                id="checkout-email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Sua conta só é criada depois que você confirmar este e-mail.
              </p>
            </div>
            <div>
              <Label htmlFor="checkout-cpf">CPF do pagador</Label>
              <Input
                id="checkout-cpf"
                inputMode="numeric"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                className="mt-1.5"
                value={cpf}
                onChange={(event) => setCpf(maskCpf(event.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep("plan")}
              >
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={verify.isPending}>
                {verify.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="mr-2 size-4" aria-hidden="true" />
                )}
                Enviar código
              </Button>
            </div>
          </form>
        ) : null}

        {step === "code" && verification ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              confirm.mutate();
            }}
          >
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm">
              Enviamos um código de 6 dígitos para{" "}
              <span className="font-semibold">{verification.email}</span>. Ele expira em 15 minutos.
            </div>

            {!verification.emailDelivered && verification.fallbackCode ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <p className="font-semibold text-amber-600">Envio de e-mail ainda não configurado</p>
                <p className="mt-1 text-muted-foreground">
                  Enquanto o domínio remetente não estiver ativo, use o código abaixo:
                </p>
                <p className="tabular mt-1.5 text-lg font-extrabold tracking-[0.3em]">
                  {verification.fallbackCode}
                </p>
              </div>
            ) : null}

            <div>
              <Label htmlFor="checkout-code">Código de verificação</Label>
              <Input
                id="checkout-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="000000"
                className="tabular mt-1.5 text-center text-lg tracking-[0.4em]"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={verify.isPending}
                onClick={() => verify.mutate()}
              >
                Reenviar código
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={confirm.isPending || create.isPending || code.length !== 6}
              >
                {confirm.isPending || create.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <QrCode className="mr-2 size-4" aria-hidden="true" />
                )}
                Confirmar e gerar Pix
              </Button>
            </div>
          </form>
        ) : null}

        {step === "pix" && charge ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-sm">

              <span>
                {charge.planName} · {cycle === "annual" ? "anual" : "mensal"}
              </span>
              <span className="tabular font-bold">{formatCurrency(charge.amount)}</span>
            </div>

            {charge.qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${charge.qrCodeBase64}`}
                alt="QR Code Pix para pagamento"
                width={280}
                height={280}
                className="mx-auto size-56 rounded-xl border border-border bg-white p-2"
              />
            ) : null}

            {charge.qrCode ? (
              <div>
                <Label htmlFor="pix-code">Pix copia e cola</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input id="pix-code" readOnly value={charge.qrCode} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copy(charge.qrCode as string, "Código Pix")}
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    <span className="sr-only">Copiar código Pix</span>
                  </Button>
                </div>
              </div>
            ) : null}

            <p
              aria-live="polite"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {CHECKOUT_STATUS_LABEL[status] ?? status} — confirmamos automaticamente em segundos.
            </p>

            <div className="space-y-1 text-center">
              {charge.ticketUrl ? (
                <a
                  href={charge.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs font-medium text-primary underline underline-offset-2"
                >
                  Abrir comprovante no Mercado Pago
                </a>
              ) : null}
              <a
                href={`/pedido/${charge.paymentId}`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-medium text-primary underline underline-offset-2"
              >
                Acompanhar meu pedido em uma página própria
              </a>
            </div>

          </div>
        ) : null}

        {step === "done" && licenseKey ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15">
              <Check className="size-6 text-success" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              Recebemos seu pagamento. Guarde a chave abaixo — ela também fica registrada no seu
              e-mail de compra ({email}).
            </p>
            <p className="tabular select-all rounded-xl border border-brand/40 bg-brand/5 p-3 font-mono text-lg font-bold tracking-widest">
              {licenseKey}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copy(licenseKey, "Chave de ativação")}
              >
                <Copy className="mr-2 size-4" aria-hidden="true" />
                Copiar chave
              </Button>
              <Button className="flex-1" onClick={activateNow}>
                Ativar agora
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
