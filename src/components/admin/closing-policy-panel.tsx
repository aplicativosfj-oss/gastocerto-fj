import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmblemShield } from "@/components/ui/panel-emblems";
import { DEFAULT_CLOSING_POLICY, type ClosingPolicy } from "@/lib/closing-policy";
import { getClosingPolicy, saveClosingPolicy } from "@/lib/closing-policy.functions";

/** Administrador controla o bloqueio global de edições em meses anteriores. */
export function ClosingPolicyPanel() {
  const load = useServerFn(getClosingPolicy);
  const save = useServerFn(saveClosingPolicy);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["closing-policy"],
    queryFn: () => load({ data: undefined }),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<ClosingPolicy>(DEFAULT_CLOSING_POLICY);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (policy: ClosingPolicy) => save({ data: policy }),
    onSuccess: (policy) => {
      toast.success("Política de fechamento atualizada.");
      queryClient.setQueryData(["closing-policy"], policy);
      void queryClient.invalidateQueries({ queryKey: ["closing-policy"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Falha ao salvar."),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="flex items-start gap-3">
        <EmblemShield className="size-10 shrink-0" />
        <div>
          <h3 className="text-base font-semibold text-foreground">Fechamento de meses anteriores</h3>
          <p className="text-sm text-muted-foreground">
            Quando o bloqueio está ativo, nenhum cliente consegue inserir ou editar lançamentos de
            competências passadas — só por liberação aprovada aqui no painel.
          </p>
        </div>
      </header>

      {query.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando política…
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4">
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lock className="size-4" /> Bloquear edições de meses anteriores
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Vale para todos os clientes e também é validado no banco de dados.
              </span>
            </span>
            <Switch
              checked={form.lockPastMonths}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, lockPastMonths: checked }))}
            />
          </label>

          <label className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4">
            <span>
              <span className="text-sm font-medium text-foreground">
                Exigir senha do usuário para editar mês anterior
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Confirmação de identidade antes de salvar retificações em competências passadas.
              </span>
            </span>
            <Switch
              checked={form.requirePasswordForPastEdits}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, requirePasswordForPastEdits: checked }))
              }
            />
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="closing-notice">Aviso exibido ao cliente (opcional)</Label>
            <Input
              id="closing-notice"
              value={form.notice}
              maxLength={300}
              placeholder="Ex.: retificações só com solicitação aprovada pelo suporte."
              onChange={(event) => setForm((prev) => ({ ...prev, notice: event.target.value }))}
            />
          </div>

          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar política
          </Button>
        </div>
      )}
    </section>
  );
}
