import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/format";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  year: number;
  month: number;
  created_at: string;
  changes: Record<string, { description?: string; amount?: number; transaction_date?: string }>;
};

const ACTION_LABEL: Record<string, string> = {
  insert: "Incluiu",
  update: "Editou",
  delete: "Excluiu",
};

/** Histórico de alterações feitas em competências já fechadas. */
export function useClosedPeriodAudit(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["closed_period_audit", user?.id, limit],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("closed_period_audit")
        .select("id, action, entity, year, month, created_at, changes")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
}

export function ClosedPeriodAuditPanel() {
  const { data, isLoading } = useClosedPeriodAudit();

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert className="size-4 text-[oklch(0.7_0.16_25)]" />
        Auditoria de meses fechados
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Toda inclusão, edição ou exclusão em competências fechadas fica registrada aqui, com o antes
        e o depois.
      </p>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando histórico…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma alteração registrada em meses fechados.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(data ?? []).map((row) => {
            const before = row.changes?.before;
            const after = row.changes?.after;
            return (
              <li key={row.id} className="rounded-lg border border-border/70 px-2.5 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {ACTION_LABEL[row.action] ?? row.action} ·{" "}
                    {String(row.month).padStart(2, "0")}/{row.year}
                  </span>
                  <Badge variant="secondary">{formatDate(row.created_at.slice(0, 10))}</Badge>
                </div>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {before ? (
                    <p className="text-muted-foreground">
                      Antes: {before.description} · {formatCurrency(Number(before.amount ?? 0))}
                    </p>
                  ) : null}
                  {after ? (
                    <p>
                      Depois: {after.description} · {formatCurrency(Number(after.amount ?? 0))}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
