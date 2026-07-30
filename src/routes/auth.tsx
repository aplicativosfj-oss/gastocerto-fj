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
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import {
  forgotPasswordSchema,
  friendlyAuthError,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — GastoCerto" },
      {
        name: "description",
        content: "Acesse sua conta GastoCerto para controlar seus gastos com segurança.",
      },
      { property: "og:title", content: "Entrar ou criar conta — GastoCerto" },
      {
        property: "og:description",
        content: "Acesse sua conta GastoCerto para controlar seus gastos com segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

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
          ) : (
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <SignInForm onForgot={() => setMode("forgot")} />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignUpForm />
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

function GoogleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    window.location.assign("/painel");
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogle}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
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
    setLoading(false);

    if (error) {
      console.error("[auth] falha no login", error.message);
      toast.error(friendlyAuthError(error.message));
      return;
    }
    navigate({ to: "/painel", replace: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="login-email">E-mail</Label>
        <Input id="login-email" name="email" type="email" autoComplete="email" className="mt-1.5" />
        <FieldError message={errors.email} />
      </div>
      <div>
        <Label htmlFor="login-password">Senha</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1.5"
        />
        <FieldError message={errors.password} />
      </div>

      <button
        type="button"
        onClick={onForgot}
        className="text-xs font-medium text-primary hover:underline"
      >
        Esqueci minha senha
      </button>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Entrar
      </Button>

      <Separator />
      <GoogleButton label="Entrar com Google" />
    </form>
  );
}

function SignUpForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
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
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/painel`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);

    if (error) {
      console.error("[auth] falha no cadastro", error.message);
      toast.error(friendlyAuthError(error.message));
      return;
    }
    setSent(true);
    toast.success("Cadastro realizado! Confirme seu e-mail para ativar a conta.");
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para o e-mail informado. Abra a mensagem para ativar sua
          conta e começar a usar o GastoCerto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="signup-name">Nome completo</Label>
        <Input id="signup-name" name="fullName" autoComplete="name" className="mt-1.5" />
        <FieldError message={errors.fullName} />
      </div>
      <div>
        <Label htmlFor="signup-email">E-mail</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-1.5"
        />
        <FieldError message={errors.email} />
      </div>
      <div>
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Mínimo de 8 caracteres, com letras e números.
        </p>
        <FieldError message={errors.password} />
      </div>
      <div>
        <Label htmlFor="signup-confirm">Confirmar senha</Label>
        <Input
          id="signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="mt-1.5"
        />
        <FieldError message={errors.confirmPassword} />
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

      <Separator />
      <GoogleButton label="Criar conta com Google" />
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
          Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.
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
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>
      <div>
        <Label htmlFor="forgot-email">E-mail</Label>
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

function Separator() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">ou</span>
      <span className="h-px flex-1 bg-border" />
    </div>
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
