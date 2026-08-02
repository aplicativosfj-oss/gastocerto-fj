/**
 * Avisos do Espaço Kids em tempo real na tela do responsável: assina as
 * inserções de notificações e do histórico e atualiza a tela sem recarregar.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { showDeviceAlert } from "@/lib/push-alerts";

type NotificationRow = {
  id: string;
  notification_type: string | null;
  title: string | null;
  message: string | null;
  severity: string | null;
};

type AuditRow = {
  id: string;
  action: string | null;
  title: string | null;
  description: string | null;
};

export function useKidsRealtimeAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`kids-alerts-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (!row?.id || seen.current.has(row.id)) return;
          seen.current.add(row.id);
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          if (row.notification_type !== "kids") return;

          const title = row.title ?? "Espaço Kids";
          const message = row.message ?? "";
          if (row.severity === "critical" || row.severity === "warning") {
            toast.warning(title, { description: message, duration: 8000 });
          } else {
            toast.success(title, { description: message, duration: 6000 });
          }
          showDeviceAlert(title, message, `kids-${row.id}`);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "kids_audit_log",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as AuditRow;
          if (!row?.id || seen.current.has(`audit-${row.id}`)) return;
          seen.current.add(`audit-${row.id}`);
          void queryClient.invalidateQueries({ queryKey: ["kids-audit"] });
          void queryClient.invalidateQueries({ queryKey: ["kids-goals"] });

          // Conquista e resgate merecem destaque imediato para o responsável.
          if (row.action === "conquista" || row.action === "resgate") {
            const title = row.title ?? "Espaço Kids";
            const message = row.description ?? "";
            toast.success(title, { description: message, duration: 8000 });
            showDeviceAlert(title, message, `kids-audit-${row.id}`);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
