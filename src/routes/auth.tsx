import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
    <main className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
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

              <TabsContent value="login" className="mt-6">
                <CpfSignInForm
                  onForgot={() => setMode("forgot")}
                  onAdmin={() => setMode("admin")}
                />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <CpfSignUpForm onDone={() => setMode("login")} />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Voltar para a página inicial
          </Link>
        </p>
      </div>
    </main>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function CpfInput({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
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
      className="mt-1.5"
      onChange={(event) => onChange(maskCpf(event.target.value))}
    />
  );
}

function PinInput({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = cpfSignInSchema.safeParse({
      cpf,
      pin: String(form.get("pin") ?? ""),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: cpfToLoginEmail(parsed.data.cpf),
      password: pinToPassword(parsed.data.cpf, parsed.data.pin),
    });
    setLoading(false);

    if (error) {
      console.error("[auth] falha no login por CPF", error.message);
      toast.error(friendlyAuthError(error.message));
      return;
    }
    navigate({ to: "/painel", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="login-cpf">CPF</Label>
        <CpfInput id="login-cpf" name="cpf" value={cpf} onChange={setCpf} />
        <FieldError message={errors.cpf} />
      </div>
      <div>
        <Label htmlFor="login-pin">Senha (6 dígitos)</Label>
        <PinInput id="login-pin" name="pin" autoComplete="current-password" />
        <FieldError message={errors.pin} />
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
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}

function CpfSignUpForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
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
      toast.error(friendlyAuthError(error.message));
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="signup-name">Nome completo</Label>
        <Input id="signup-name" name="fullName" autoComplete="name" className="mt-1.5" />
        <FieldError message={errors.fullName} />
      </div>
      <div>
        <Label htmlFor="signup-cpf">CPF</Label>
        <CpfInput id="signup-cpf" name="cpf" value={cpf} onChange={setCpf} />
        <FieldError message={errors.cpf} />
      </div>
      <div>
        <Label htmlFor="signup-contact">E-mail de contato (opcional)</Label>
        <Input
          id="signup-contact"
          name="contactEmail"
          type="email"
          autoComplete="email"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Usado apenas para recuperar sua senha. Sem e-mail, a recuperação é feita pelo suporte.
        </p>
        <FieldError message={errors.contactEmail} />
      </div>
      <div>
        <Label htmlFor="signup-pin">Senha (6 dígitos)</Label>
        <PinInput id="signup-pin" name="pin" autoComplete="new-password" />
        <FieldError message={errors.pin} />
      </div>
      <div>
        <Label htmlFor="signup-confirm">Confirmar senha</Label>
        <PinInput id="signup-confirm" name="confirmPin" autoComplete="new-password" />
        <FieldError message={errors.confirmPin} />
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox name="acceptTerms" className="mt-0.5" />
          <span>Li e aceito os termos de uso do GastoCerto.</span>
        </label>
        <FieldError message={errors.acceptTerms} />
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox name="acceptPrivacy" className="mt-0.5" />
          <span>Li e aceito a política de privacidade e o tratamento de dados conforme a LGPD.</span>
        </label>
        <FieldError message={errors.acceptPrivacy} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Criar conta gratuita
      </Button>
    </form>
  );
}

function AdminSignInForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
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
      toast.error(friendlyAuthError(error.message));
      return;
    }
    navigate({ to: "/painel", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Acesso administrativo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrada por e-mail e senha, reservada à equipe.
        </p>
      </div>
      <div>
        <Label htmlFor="admin-email">E-mail</Label>
        <Input id="admin-email" name="email" type="email" autoComplete="email" className="mt-1.5" />
        <FieldError message={errors.email} />
      </div>
      <div>
        <Label htmlFor="admin-password">Senha</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1.5"
        />
        <FieldError message={errors.password} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Entrar
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
          className="mt-1.5"
        />
        <FieldError message={errors.email} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Enviar link de recuperação
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
