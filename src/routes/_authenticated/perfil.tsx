import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LicenseCard } from "@/components/finance/license-card";

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
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seus dados ficam visíveis apenas para você.
          </p>
        </header>

        <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <Avatar className="size-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="Foto de perfil" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <Button
              type="button"
              variant="outline"
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
            <p className="mt-2 text-xs text-muted-foreground">JPG, PNG ou WEBP até 2 MB.</p>
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
          className="space-y-4 rounded-2xl border border-border bg-card p-4"
          noValidate
        >
          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={profile?.full_name ?? ""}
              className="mt-1.5"
              maxLength={100}
            />
            {errors.fullName ? (
              <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={user?.email ?? ""} className="mt-1.5" disabled />
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              className="mt-1.5"
              maxLength={20}
            />
            {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone}</p> : null}
          </div>

          <div>
            <Label htmlFor="monthlyIncome">Renda mensal (R$)</Label>
            <Input
              id="monthlyIncome"
              name="monthlyIncome"
              inputMode="decimal"
              defaultValue={profile?.monthly_income != null ? String(profile.monthly_income) : ""}
              className="mt-1.5 tabular-nums"
            />
            {errors.monthlyIncome ? (
              <p className="mt-1 text-xs text-destructive">{errors.monthlyIncome}</p>
            ) : null}
          </div>

          <div className="text-xs text-muted-foreground">
            Perfil de acesso: {(roles ?? ["user"]).join(", ")}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </form>

        <LicenseCard />
      </div>

    </AppShell>
  );
}
