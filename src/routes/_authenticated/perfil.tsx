import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Upload, User } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/finance/page-header";
import { LicenseCard } from "@/components/finance/license-card";
import { PlanSummaryCard } from "@/components/finance/plan-summary-card";
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

  async function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    setUploading(true);
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

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
    event.target.value = "";

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
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-7">
        <PageHeader
          icon={User}
          eyebrow="Configurações"
          title="Meu perfil"
          description="Seus dados pessoais e informações de conta."
          className="lg:p-4"
        />

        <section className="interactive-card flex items-center gap-5 rounded-xl border border-border bg-card p-5 shadow-soft">
          <Avatar className="size-20 border-2 border-background shadow-sm">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
            <AvatarFallback className="bg-muted text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 font-bold uppercase tracking-wider text-[11px]"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Alterar foto
            </Button>
            <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">
              Resolução recomendada: 400x400px
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatar}
            />
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="interactive-card space-y-5 rounded-xl border border-border bg-card p-6 shadow-soft"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nome completo</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile?.full_name ?? ""}
                className="h-10 rounded-lg border-border/60"
                maxLength={100}
              />
              {errors.fullName ? (
                <p className="mt-1 text-[11px] text-destructive font-medium">{errors.fullName}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
              <Input id="email" value={user?.email ?? ""} className="h-10 rounded-lg bg-muted/30 border-border/40" disabled />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={profile?.phone ?? ""}
                className="h-10 rounded-lg border-border/60"
                maxLength={20}
              />
              {errors.phone ? <p className="mt-1 text-[11px] text-destructive font-medium">{errors.phone}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monthlyIncome" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Renda mensal (R$)</Label>
              <Input
                id="monthlyIncome"
                name="monthlyIncome"
                inputMode="decimal"
                defaultValue={profile?.monthly_income != null ? String(profile.monthly_income) : ""}
                className="h-10 rounded-lg border-border/60 tabular-nums font-semibold"
              />
              {errors.monthlyIncome ? (
                <p className="mt-1 text-[11px] text-destructive font-medium">{errors.monthlyIncome}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Acesso: <span className="text-foreground">{(roles ?? ["user"]).join(", ")}</span>
            </div>
            <Button type="submit" size="sm" className="h-9 px-5 font-bold uppercase tracking-wider text-[11px]" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </form>

        <PlanSummaryCard />

        <TrialCard />

        <LicenseCard />
      </div>

    </AppShell>
  );
}
