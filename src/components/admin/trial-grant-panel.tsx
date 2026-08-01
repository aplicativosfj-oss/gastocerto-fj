import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf } from "@/lib/cpf";
import { formatDateTime } from "@/lib/format";
import { adminGrantTrial } from "@/lib/plan.functions";
import { TRIAL_OPTIONS, type TrialSlug } from "@/lib/plan-features";

type Row = {
  user_id: string;
  full_name: string | null;
  cpf: string | null;
  trial_plan_slug: string | null;
  trial_ends_at: string | null;
};

export function TrialGrantPanel() {
  const grant = useServerFn(adminGrantTrial);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [slug, setSlug] = useState<TrialSlug>("trial_7");

  const users = useQuery({
    queryKey: ["admin", "trial-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, cpf, trial_plan_slug, trial_ends_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = users.data ?? [];
    if (!term) return rows.slice(0, 12);
    return rows
      .filter(
        (row) =>
          (row.full_name ?? "").toLowerCase().includes(term) ||
          (row.cpf ?? "").includes(term.replace(/\D/g, "")),
      )
      .slice(0, 12);
  }, [users.data, search]);

  const mutation = useMutation({
    mutationFn: (targetUserId: string) => grant({ data: { targetUserId, slug, restart: true } }),
    onSuccess: (result) => {
      toast.success(`Teste de ${result.days} dias liberado até ${formatDateTime(result.endsAt)}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "trial-users"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível conceder o teste."),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.72_0.14_160/0.15)]">
          <Gift className="size-4 text-[oklch(0.62_0.14_160)]" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Conceder período de teste (Cortesia)</h2>
          <p className="text-xs text-muted-foreground">
            Libera acesso imediato a um usuário específico por um período determinado.
          </p>
        </div>
      </header>

      <div className="mt-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-1">Como usar:</h3>
        <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
          <li>Busque o usuário pelo <strong>nome ou CPF</strong> abaixo.</li>
          <li>Escolha a <strong>duração</strong> desejada (7, 15 ou 30 dias).</li>
          <li>Clique em <strong>"Liberar teste"</strong> para ativar instantaneamente.</li>
          <li>O usuário terá acesso a <strong>todos os recursos</strong>, inclusive a IA.</li>
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="min-w-56 flex-1 space-y-1">
          <Label htmlFor="trial-search" className="text-xs">
            Buscar usuário
          </Label>
          <Input
            id="trial-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou CPF"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duração</Label>
          <Select value={slug} onValueChange={(value) => setSlug(value as TrialSlug)}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIAL_OPTIONS.map((option) => (
                <SelectItem key={option.slug} value={option.slug}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {users.isLoading ? (
        <Loader2 className="mt-4 size-5 animate-spin text-muted-foreground" />
      ) : (
        <ul className="mt-3 divide-y divide-border/70">
          {filtered.map((row) => (
            <li key={row.user_id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {row.cpf ? maskCpf(row.cpf) : "sem CPF"}
                  {row.trial_ends_at
                    ? ` · teste ${row.trial_plan_slug ?? ""} até ${formatDateTime(row.trial_ends_at)}`
                    : " · nunca usou teste"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(row.user_id)}
              >
                Liberar teste
              </Button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="py-3 text-xs text-muted-foreground">Nenhum usuário encontrado.</li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
