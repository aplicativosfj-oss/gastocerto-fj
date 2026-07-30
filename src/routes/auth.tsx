import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import authSide from "@/assets/auth-side.jpg";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cpfToLoginEmail, maskCpf, onlyDigits, pinToPassword } from "@/lib/cpf";
import {
  cpfSignInSchema,
  cpfSignUpSchema,
  forgotPasswordSchema,
  friendlyAuthError,
  signInSchema,
} from "@/lib/validation";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar com CPF — GastoCerto" },
      {
        name: "description",
        content: "Acesse o GastoCerto com seu CPF e senha de 6 dígitos.",
      },
      { property: "og:title", content: "Entrar com CPF — GastoCerto" },
      {
        property: "og:description",
        content: "Acesse o GastoCerto com seu CPF e senha de 6 dígitos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot" | "admin";

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "login");

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/painel", replace: true });
    }
  }, [loading, session, navigate]);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_minmax(0,26rem)]">
      <section className="relative isolate hidden overflow-hidden bg-[oklch(0.16_0.03_258)] text-white lg:flex lg:flex-col lg:justify-between lg:p-8">
        <img
          src={authSide}
          alt=""
          aria-hidden="true"
          width={1024}
          height={1280}
          decoding="async"
          className="absolute inset-0 -z-20 size-full object-cover opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,oklch(0.16_0.03_258/0.92)_10%,oklch(0.16_0.03_258/0.6)_60%,oklch(0.16_0.03_258/0.9)_100%)]"
        />
        <Link to="/" className="inline-flex w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <Logo onDark />
        </Link>
        <div className="max-w-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Seu dinheiro, sob controle
          </p>
          <h2 className="font-display mt-2 text-3xl font-extrabold leading-tight tracking-[-0.02em]">
            Cada abastecimento, conta e gasto no mesmo lugar.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Entre com CPF e senha de 6 dígitos. Sem cartão de crédito, sem burocracia.
          </p>
          <ul className="mt-4 grid gap-1.5 text-[13px] text-white/80">
            <li>• Painel mensal com gastos por categoria</li>
            <li>• Combustível com custo por km automático</li>
            <li>• Alertas de vencimento e orçamento</li>
          </ul>
        </div>
        <p className="text-[11px] text-white/60">Dev. Franc D&apos;nis · Feijó-AC</p>
      </section>

      <section className="relative flex items-center justify-center bg-secondary/30 px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-5 flex justify-center lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {mode === "forgot" ? (
              <ForgotPasswordForm onBack={() => setMode("login")} />
            ) : mode === "admin" ? (
              <AdminSignInForm onBack={() => setMode("login")} />
            ) : (
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-5">
                  <CpfSignInForm
                    onForgot={() => setMode("forgot")}
                    onAdmin={() => setMode("admin")}
                  />
                </TabsContent>
                <TabsContent value="signup" className="mt-5">
                  <CpfSignUpForm onDone={() => setMode("login")} />
                </TabsContent>
              </Tabs>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs text-destructive">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/** Resumo de erros anunciado por leitores de tela ao falhar o envio. */
function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      tabIndex={-1}
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
    >
      <AlertCircle className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** Anuncia estados de carregamento sem depender de cor ou spinner. */
function StatusLive({ busy, label }: { busy: boolean; label: string }) {
  return (
    <span className="sr-only" aria-live="polite">
      {busy ? label : ""}
    </span>
  );
}

function describedBy(...ids: (string | false | undefined)[]) {
  const list = ids.filter(Boolean) as string[];
  return list.length ? list.join(" ") : undefined;
}

function summaryFromErrors(errors: Record<string, string>) {
  const count = Object.keys(errors).length;
  if (!count) return null;
  return count === 1
    ? "Corrija o campo indicado abaixo para continuar."
    : `Corrija os ${count} campos indicados abaixo para continuar.`;
}

function CpfInput({
  id,
  name,
  value,
  onChange,
  invalid,
  describedById,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedById?: string;
}) {
  return (
    <Input
      id={id}
      name={name}
      value={value}
      inputMode="numeric"
      autoComplete="username"
      placeholder="000.000.000-00"
      maxLength={14}
      required
      aria-invalid={invalid || undefined}
      aria-describedby={describedById}
      className="mt-1.5"
      onChange={(event) => onChange(maskCpf(event.target.value))}
    />
  );
}

function PinInput({
  id,
  name,
  autoComplete,
  invalid,
  describedById,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  invalid?: boolean;
  describedById?: string;
}) {
  return (
    <Input
      id={id}
      name={name}
      type="password"
      inputMode="numeric"
      autoComplete={autoComplete}
      placeholder="••••••"
      maxLength={6}
      required
      aria-invalid={invalid || undefined}
      aria-describedby={describedById}
      className="mt-1.5 tracking-[0.4em]"
      onChange={(event) => {
        event.target.value = onlyDigits(event.target.value).slice(0, 6);
      }}
    />
  );
}

function CpfSignInForm({ onForgot, onAdmin }: { onForgot: () => void; onAdmin: () => void }) {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  function fail(message: string, fields: Record<string, string> = {}) {
    setErrors(fields);
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = cpfSignInSchema.safeParse({
      cpf,
      pin: String(form.get("pin") ?? ""),
    });

    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      fail(summaryFromErrors(fields) ?? "Revise os dados informados.", fields);
      return;
    }

    setErrors({});
    setFormError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: cpfToLoginEmail(parsed.data.cpf),
      password: pinToPassword(parsed.data.cpf, parsed.data.pin),
    });
    setLoading(false);

    if (error) {
      console.error("[auth] falha no login por CPF", error.message);
      const message = error.message.toLowerCase().includes("invalid login credentials")
        ? "CPF ou senha incorretos. Confira os 11 dígitos do CPF e os 6 dígitos da senha."
        : friendlyAuthError(error.message);
      fail(message);
      toast.error(message);
      return;
    }
    navigate({ to: "/painel", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
      <div ref={alertRef} tabIndex={-1} className="outline-none">
        <FormAlert message={formError} />
      </div>
      <div>
        <Label htmlFor="login-cpf">CPF</Label>
        <CpfInput
          id="login-cpf"
          name="cpf"
          value={cpf}
          onChange={setCpf}
          invalid={Boolean(errors.cpf)}
          describedById={describedBy(errors.cpf && "login-cpf-error", "login-cpf-hint")}
        />
        <p id="login-cpf-hint" className="mt-1 text-xs text-muted-foreground">
          Digite os 11 dígitos, com ou sem pontuação.
        </p>
        <FieldError id="login-cpf-error" message={errors.cpf} />
      </div>
      <div>
        <Label htmlFor="login-pin">Senha (6 dígitos)</Label>
        <PinInput
          id="login-pin"
          name="pin"
          autoComplete="current-password"
          invalid={Boolean(errors.pin)}
          describedById={describedBy(errors.pin && "login-pin-error")}
        />
        <FieldError id="login-pin-error" message={errors.pin} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs font-medium text-primary hover:underline"
        >
          Esqueci minha senha
        </button>
        <button
          type="button"
          onClick={onAdmin}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Acesso administrativo
        </button>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
        Entrar
        <StatusLive busy={loading} label="Entrando, aguarde." />
      </Button>

      <LegalNote />
    </form>
  );
}

/** Aviso legal com links para termos e privacidade. */
function LegalNote() {
  return (
    <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
      Ao continuar você concorda com os{" "}
      <Link to="/termos" className="font-medium text-primary underline underline-offset-2">
        Termos de Uso
      </Link>{" "}
      e a{" "}
      <Link to="/privacidade" className="font-medium text-primary underline underline-offset-2">
        Política de Privacidade
      </Link>
      .
    </p>
  );
}

function CpfSignUpForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  function fail(message: string, fields: Record<string, string> = {}) {
    setErrors(fields);
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = cpfSignUpSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      cpf,
      contactEmail: String(form.get("contactEmail") ?? ""),
      pin: String(form.get("pin") ?? ""),
      confirmPin: String(form.get("confirmPin") ?? ""),
      acceptTerms: form.get("acceptTerms") === "on",
      acceptPrivacy: form.get("acceptPrivacy") === "on",
    });

    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      fail(summaryFromErrors(fields) ?? "Revise os dados informados.", fields);
      return;
    }

    setErrors({});
    setFormError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: cpfToLoginEmail(parsed.data.cpf),
      password: pinToPassword(parsed.data.cpf, parsed.data.pin),
      options: {
        data: {
          full_name: parsed.data.fullName,
          cpf: parsed.data.cpf,
          contact_email: parsed.data.contactEmail || null,
        },
      },
    });

    if (error) {
      setLoading(false);
      console.error("[auth] falha no cadastro por CPF", error.message);
      const raw = error.message.toLowerCase();
      const message = raw.includes("already registered")
        ? "Já existe uma conta com este CPF. Use a aba Entrar ou recupere a senha."
        : friendlyAuthError(error.message);
      fail(message, raw.includes("already registered") ? { cpf: "CPF já cadastrado" } : {});
      toast.error(message);
      return;
    }

    // Contas por CPF não dependem de confirmação de e-mail: entra direto.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cpfToLoginEmail(parsed.data.cpf),
      password: pinToPassword(parsed.data.cpf, parsed.data.pin),
    });
    setLoading(false);

    if (signInError) {
      toast.success("Conta criada! Faça login com seu CPF.");
      onDone();
      return;
    }
    toast.success("Conta criada com sucesso!");
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
      <div ref={alertRef} tabIndex={-1} className="outline-none">
        <FormAlert message={formError} />
      </div>
      <div>
        <Label htmlFor="signup-name">Nome completo</Label>
        <Input
          id="signup-name"
          name="fullName"
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.fullName) || undefined}
          aria-describedby={describedBy(errors.fullName && "signup-name-error")}
          className="mt-1.5"
        />
        <FieldError id="signup-name-error" message={errors.fullName} />
      </div>
      <div>
        <Label htmlFor="signup-cpf">CPF</Label>
        <CpfInput
          id="signup-cpf"
          name="cpf"
          value={cpf}
          onChange={setCpf}
          invalid={Boolean(errors.cpf)}
          describedById={describedBy(errors.cpf && "signup-cpf-error", "signup-cpf-hint")}
        />
        <p id="signup-cpf-hint" className="mt-1 text-xs text-muted-foreground">
          Validamos os dígitos verificadores do CPF.
        </p>
        <FieldError id="signup-cpf-error" message={errors.cpf} />
      </div>
      <div>
        <Label htmlFor="signup-contact">E-mail de contato (opcional)</Label>
        <Input
          id="signup-contact"
          name="contactEmail"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.contactEmail) || undefined}
          aria-describedby={describedBy(errors.contactEmail && "signup-contact-error", "signup-contact-hint")}
          className="mt-1.5"
        />
        <p id="signup-contact-hint" className="mt-1 text-xs text-muted-foreground">
          Usado apenas para recuperar sua senha. Sem e-mail, a recuperação é feita pelo suporte.
        </p>
        <FieldError id="signup-contact-error" message={errors.contactEmail} />
      </div>
      <div>
        <Label htmlFor="signup-pin">Senha (6 dígitos)</Label>
        <PinInput
          id="signup-pin"
          name="pin"
          autoComplete="new-password"
          invalid={Boolean(errors.pin)}
          describedById={describedBy(errors.pin && "signup-pin-error", "signup-pin-hint")}
        />
        <p id="signup-pin-hint" className="mt-1 text-xs text-muted-foreground">
          Somente números. Evite sequências como 123456 ou datas de nascimento.
        </p>
        <FieldError id="signup-pin-error" message={errors.pin} />
      </div>
      <div>
        <Label htmlFor="signup-confirm">Confirmar senha</Label>
        <PinInput
          id="signup-confirm"
          name="confirmPin"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPin)}
          describedById={describedBy(errors.confirmPin && "signup-confirm-error")}
        />
        <FieldError id="signup-confirm-error" message={errors.confirmPin} />
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox
            id="signup-terms"
            name="acceptTerms"
            className="mt-0.5"
            aria-invalid={Boolean(errors.acceptTerms) || undefined}
            aria-describedby={describedBy(errors.acceptTerms && "signup-terms-error")}
          />
          <Label htmlFor="signup-terms" className="text-xs font-normal leading-snug text-muted-foreground">
            Li e aceito os{" "}
            <Link
              to="/termos"
              className="font-medium text-primary underline underline-offset-2"
            >
              Termos de Uso
            </Link>{" "}
            do GastoCerto.
          </Label>
        </div>
        <FieldError id="signup-terms-error" message={errors.acceptTerms} />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox
            id="signup-privacy"
            name="acceptPrivacy"
            className="mt-0.5"
            aria-invalid={Boolean(errors.acceptPrivacy) || undefined}
            aria-describedby={describedBy(errors.acceptPrivacy && "signup-privacy-error")}
          />
          <Label htmlFor="signup-privacy" className="text-xs font-normal leading-snug text-muted-foreground">
            Li e aceito a{" "}
            <Link
              to="/privacidade"
              className="font-medium text-primary underline underline-offset-2"
            >
              Política de Privacidade
            </Link>{" "}
            e o tratamento de dados conforme a LGPD.
          </Label>
        </div>
        <FieldError id="signup-privacy-error" message={errors.acceptPrivacy} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
        Criar conta gratuita
        <StatusLive busy={loading} label="Criando sua conta, aguarde." />
      </Button>
    </form>
  );
}

function AdminSignInForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  function fail(message: string, fields: Record<string, string> = {}) {
    setErrors(fields);
    setFormError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      fail(summaryFromErrors(fields) ?? "Revise os dados informados.", fields);
      return;
    }

    setErrors({});
    setFormError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error && error.message.toLowerCase().includes("invalid login credentials")) {
      // Primeiro acesso do administrador: cria a conta com o e-mail informado.
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/painel`,
          data: { full_name: "Administrador" },
        },
      });
      if (signUpError) {
        setLoading(false);
        fail(friendlyAuthError(signUpError.message));
        toast.error(friendlyAuthError(signUpError.message));
        return;
      }
      const retry = await supabase.auth.signInWithPassword(parsed.data);
      setLoading(false);
      if (retry.error) {
        toast.success("Conta criada. Confirme o e-mail para acessar.");
        return;
      }
      navigate({ to: "/painel", replace: true });
      return;
    }

    setLoading(false);
    if (error) {
      fail(friendlyAuthError(error.message));
      toast.error(friendlyAuthError(error.message));
      return;
    }
    navigate({ to: "/painel", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
      <div ref={alertRef} tabIndex={-1} className="outline-none">
        <FormAlert message={formError} />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Acesso administrativo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrada por e-mail e senha, reservada à equipe.
        </p>
      </div>
      <div>
        <Label htmlFor="admin-email">E-mail</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={describedBy(errors.email && "admin-email-error")}
          className="mt-1.5"
        />
        <FieldError id="admin-email-error" message={errors.email} />
      </div>
      <div>
        <Label htmlFor="admin-password">Senha</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors.password) || undefined}
          aria-describedby={describedBy(errors.password && "admin-password-error")}
          className="mt-1.5"
        />
        <FieldError id="admin-password-error" message={errors.password} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
        Entrar
        <StatusLive busy={loading} label="Entrando, aguarde." />
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Voltar para o acesso por CPF
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: String(form.get("email") ?? "") });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);

    if (error) console.error("[auth] falha ao solicitar redefinição", error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">Verifique seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Se existir uma conta com esse e-mail de contato, enviamos um link para redefinir a senha.
        </p>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Recuperar senha</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o e-mail de contato cadastrado. Se você não cadastrou um e-mail, peça a
          redefinição ao suporte.
        </p>
      </div>
      <div>
        <Label htmlFor="forgot-email">E-mail de contato</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={describedBy(errors.email && "forgot-email-error")}
          className="mt-1.5"
        />
        <FieldError id="forgot-email-error" message={errors.email} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
        Enviar link de recuperação
        <StatusLive busy={loading} label="Enviando link, aguarde." />
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Voltar
      </Button>
    </form>
  );
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
