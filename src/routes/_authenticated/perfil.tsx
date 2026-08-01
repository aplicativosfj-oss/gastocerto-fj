import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Settings2, Upload, User } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/finance/page-header";
import { AccountSettingsDialog } from "@/components/finance/account-settings-dialog";
import { AvatarCropDialog } from "@/components/finance/avatar-crop-dialog";
import { LicenseCard } from "@/components/finance/license-card";
import { LicenseDetailPanel } from "@/components/finance/license-detail-panel";
import { TrialCard } from "@/components/finance/trial-card";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, useInvalidateProfile, useProfile, useRoles } from "@/lib/queries";
import { profileSchema, validateAvatarFile } from "@/lib/validation";


export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — GastoCerto" },
      { name: "description", content: "Gerencie seus dados pessoais e foto no GastoCerto." },
      { property: "og:title", content: "Meu perfil — GastoCerto" },
      {
        property: "og:description",
        content: "Gerencie seus dados pessoais e foto no GastoCerto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: roles } = useRoles();
  const invalidateProfile = useInvalidateProfile();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const incomeRaw = String(form.get("monthlyIncome") ?? "").replace(",", ".");

    const parsed = profileSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      monthlyIncome: incomeRaw === "" ? undefined : Number(incomeRaw),
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
        monthly_income: parsed.data.monthlyIncome ?? null,
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      console.error("[perfil] falha ao atualizar", error.message);
      toast.error("Não foi possível salvar seu perfil.");
      return;
    }
    await invalidateProfile();
    toast.success("Perfil atualizado!");
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setPending(file);
  }

  async function handleCropped(blob: Blob) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      console.error("[perfil] falha no upload", uploadError.message);
      setUploading(false);
      toast.error("Não foi possível enviar a imagem.");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("user_id", user.id);
    setUploading(false);
    setPending(null);

    if (updateError) {
      console.error("[perfil] falha ao salvar avatar", updateError.message);
      toast.error("Não foi possível salvar a foto.");
      return;
    }
    await invalidateProfile();
    toast.success("Foto atualizada!");
  }


  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const initials = (profile?.full_name ?? "GC")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl space-y-3 sm:space-y-4">
        <PageHeader
          icon={User}
          eyebrow="Configurações"
          title="Meu Perfil"
          description="Gerencie sua conta e acompanhe o status da sua licença."
          className="pb-1"
        />

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Coluna esquerda: identidade */}
          <aside className="space-y-3 sm:space-y-4">
            <section className="accent-tile overflow-hidden rounded-2xl p-4 text-center shadow-soft">
              <div className="relative mx-auto mb-3 inline-block">
                <Avatar className="size-20 border-2 border-background shadow-lg ring-1 ring-border/30">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
                  <AvatarFallback className="bg-muted text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                  title="Alterar foto"
                >
                  {uploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                </button>
              </div>
              <h3 className="truncate font-display text-sm font-bold leading-tight">
                {profile?.full_name || "Usuário"}
              </h3>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {(roles ?? ["user"]).join(" • ")}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user?.email}</p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-9 w-full rounded-xl text-[10px] font-bold uppercase tracking-wider"
                onClick={() => setAccountOpen(true)}
              >
                <Settings2 className="mr-1.5 size-3.5" aria-hidden />
                Conta e segurança
              </Button>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePick}
              />
            </section>

            <TrialCard />
          </aside>

          {/* Coluna direita: dados, plano e licenças */}
          <div className="min-w-0 space-y-3 sm:space-y-4">
            <form
              onSubmit={handleSubmit}
              className="accent-tile rounded-2xl p-4 shadow-soft sm:p-5"
              noValidate
            >
              <div className="mb-3 border-b border-border/40 pb-2.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Informações pessoais
                </h2>
              </div>

              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="fullName" className={LABEL_CLASS}>
                    Nome completo
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile?.full_name ?? ""}
                    className={INPUT_CLASS}
                    maxLength={100}
                  />
                  {errors.fullName && (
                    <p className="text-[10px] font-medium text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <Label htmlFor="email" className={LABEL_CLASS}>
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    value={user?.email ?? ""}
                    className="h-10 w-full rounded-xl border-transparent bg-muted/40 opacity-70"
                    disabled
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <Label htmlFor="phone" className={LABEL_CLASS}>
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={profile?.phone ?? ""}
                    className={INPUT_CLASS}
                    maxLength={20}
                  />
                  {errors.phone && (
                    <p className="text-[10px] font-medium text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <Label htmlFor="monthlyIncome" className={LABEL_CLASS}>
                    Renda mensal estimada
                  </Label>
                  <Input
                    id="monthlyIncome"
                    name="monthlyIncome"
                    inputMode="decimal"
                    defaultValue={
                      profile?.monthly_income != null ? String(profile.monthly_income) : ""
                    }
                    className={`${INPUT_CLASS} font-semibold tabular-nums`}
                  />
                  {errors.monthlyIncome && (
                    <p className="text-[10px] font-medium text-destructive">
                      {errors.monthlyIncome}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 w-full rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md shadow-primary/20 sm:w-auto sm:px-6"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
                  Salvar perfil
                </Button>
              </div>
            </form>

            <LicenseDetailPanel />
            <LicenseCard />
          </div>
        </div>
      </div>

      <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <AvatarCropDialog
        file={pending}
        saving={uploading}
        onCancel={() => setPending(null)}
        onSave={handleCropped}
      />
    </AppShell>
  );
}

const LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70";
const INPUT_CLASS =
  "h-10 w-full rounded-xl border-border/40 bg-background/50 transition-colors focus:bg-background";

