import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type NoteHistoryEntry = Tables<"transaction_note_history">;

export const NOTE_FIELD_LABEL: Record<string, string> = {
  notes: "Anotações",
  description: "Descrição",
};

/** Histórico de alterações de descrição e anotações de um lançamento. */
export function useNoteHistory(transactionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["transaction-note-history", transactionId],
    enabled: Boolean(transactionId) && enabled,
    queryFn: async (): Promise<NoteHistoryEntry[]> => {
      const { data, error } = await supabase
        .from("transaction_note_history")
        .select("*")
        .eq("transaction_id", transactionId!)
        .order("changed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRefreshNoteHistory() {
  const queryClient = useQueryClient();
  return (transactionId: string) =>
    queryClient.invalidateQueries({ queryKey: ["transaction-note-history", transactionId] });
}
