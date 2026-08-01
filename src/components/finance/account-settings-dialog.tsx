import { Check, KeyRound, Loader2, Mail, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateProfile, useProfile } from "@/lib/queries";
import { emailSchema, fullNameSchema, passwordSchema } from "@/lib/validation";

/** Mensagem de erro do zod para um valor, ou null quando válido. */
function checkField(schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, value: string) {
  if (value.trim() === "") return null;
  const result = schema.safeParse(value);
  return result.success ? null : (result.error?.issues[0]?.message ?? "Valor inválido");
}

function FieldHint({ error, ok, okLabel }: { error: string | null; ok: boolean; okLabel: string }) {
  if (error) {
    return (
      <p className="flex items-center gap-1 text-[10px] font-medium text-destructive">
        <X className="size-3" aria-hidden />
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p className="flex items-center gap-1 text-[10px] font-medium text-[oklch(0.62_0.14_160)]">
        <Check className="size-3" aria-hidden />
        {okLabel}
      </p>
    );
  }
  return null;
}

const INPUT_CLASS =
  "h-10 rounded-xl border-border/40 bg-background/50 transition-colors focus:bg-background";
const LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70";

/**
 * Menu de conta: alterar nome, e-mail e senha com validação e feedback em tempo real.
 */
export function AccountSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const invalidateProfile = useInvalidateProfile();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"name" | "email" | "password" | null>(null);

  const nameError = useMemo(() => checkField(fullNameSchema, name), [name]);
  const emailError = useMemo(() => checkField(emailSchema, email), [email]);
  const passwordError = useMemo(() => checkField(passwordSchema, password), [password]);
  const confirmError =
    confirm.trim() === "" ? null : confirm === password ? null : "As senhas não conferem";

  const nameChanged = name.trim() !== (profile?.full_name ?? "").trim();
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();

  async function saveName() {
    if (!user || nameError || !nameChanged) return;
    setBusy("name");
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("user_id", user.id);
    setBusy(null);
    if (error) {
      toast.error("Não foi possível alterar o nome.");
      return;
    }
    await invalidateProfile();
    toast.success("Nome atualizado!");
  }

  async function saveEmail() {
    if (emailError || !emailChanged) return;
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Confirme o novo e-mail pelo link enviado para a nova caixa de entrada.");
  }

  async function savePassword() {
    if (!user?.email || passwordError || confirmError || !password || !confirm) return;
    setBusy("password");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      setBusy(null);
      toast.error("Senha atual incorreta.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    toast.success("Senha alterada com sucesso!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Conta e segurança</DialogTitle>
          <DialogDescription className="text-xs">
            Altere seu nome, e-mail de acesso e senha. As validações aparecem enquanto você digita.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="name">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="name" className="gap-1.5 text-xs">
              <UserRound className="size-3.5" aria-hidden /> Nome
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs">
              <Mail className="size-3.5" aria-hidden /> E-mail
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1.5 text-xs">
              <KeyRound className="size-3.5" aria-hidden /> Senha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="name" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name" className={LABEL_CLASS}>
                Nome completo
              </Label>
              <Input
                id="acc-name"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                className={INPUT_CLASS}
              />
              <FieldHint error={nameError} ok={!nameError && nameChanged} okLabel="Nome válido" />
            </div>
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={saveName}
              disabled={busy === "name" || Boolean(nameError) || !nameChanged}
            >
              {busy === "name" ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
              Salvar nome
            </Button>
          </TabsContent>

          <TabsContent value="email" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-email" className={LABEL_CLASS}>
                Novo e-mail
              </Label>
              <Input
                id="acc-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT_CLASS}
              />
              <FieldHint
                error={emailError}
                ok={!emailError && emailChanged}
                okLabel="E-mail válido"
              />
            </div>
            <p className="rounded-xl border border-dashed border-border/60 p-2.5 text-[11px] text-muted-foreground">
              Enviaremos um link de confirmação. O acesso só muda depois que você confirmar.
            </p>
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={saveEmail}
              disabled={busy === "email" || Boolean(emailError) || !emailChanged}
            >
              {busy === "email" ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
              Alterar e-mail
            </Button>
          </TabsContent>

          <TabsContent value="password" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-current" className={LABEL_CLASS}>
                Senha atual
              </Label>
              <Input
                id="acc-current"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-password" className={LABEL_CLASS}>
                Nova senha
              </Label>
              <Input
                id="acc-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={INPUT_CLASS}
              />
              <FieldHint
                error={passwordError}
                ok={!passwordError && password.length > 0}
                okLabel="Senha forte o suficiente"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-confirm" className={LABEL_CLASS}>
                Confirmar nova senha
              </Label>
              <Input
                id="acc-confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={INPUT_CLASS}
              />
              <FieldHint
                error={confirmError}
                ok={!confirmError && confirm.length > 0}
                okLabel="As senhas conferem"
              />
            </div>
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={savePassword}
              disabled={
                busy === "password" ||
                !currentPassword ||
                !password ||
                !confirm ||
                Boolean(passwordError) ||
                Boolean(confirmError)
              }
            >
              {busy === "password" ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
              Alterar senha
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
