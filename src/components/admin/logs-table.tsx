import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

/** Trilha completa de ações administrativas. */
export function LogsTable({ globalSearch = "" }: { globalSearch?: string }) {
  const logs = useQuery({
    queryKey: ["admin", "logs", "full"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const profiles = useQuery({
    queryKey: ["admin", "profiles", "names"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const profile of profiles.data ?? []) {
      map.set(profile.user_id, profile.full_name ?? "Usuário");
    }
    return map;
  }, [profiles.data]);

  const filteredLogs = useMemo(() => {
    const rows = logs.data ?? [];
    const term = globalSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((log) => {
      const actor = (nameByUser.get(log.actor_id) ?? "").toLowerCase();
      const target = log.target_user_id ? (nameByUser.get(log.target_user_id) ?? "").toLowerCase() : "";
      const action = (log.action || "").toLowerCase();
      const details = JSON.stringify(log.details || "").toLowerCase();
      return actor.includes(term) || target.includes(term) || action.includes(term) || details.includes(term);
    });
  }, [logs.data, globalSearch, nameByUser]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Usuário afetado</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma ação registrada ainda.
              </TableCell>
            </TableRow>
          ) : (
            filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatDateTime(log.created_at)}</TableCell>
                <TableCell>{nameByUser.get(log.actor_id) ?? "Equipe"}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  {log.target_user_id ? (nameByUser.get(log.target_user_id) ?? "—") : "—"}
                </TableCell>
                <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                  {JSON.stringify(log.details)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}