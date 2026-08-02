import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Dependent = Tables<"dependents"> & {
  pin_code?: string | null;
  kids_mode_enabled?: boolean;
  monthly_limit?: number | null;
  recurring_allowance_day?: number | null;
  last_allowance_month?: string | null;
};


export const DEPENDENT_RELATIONS = [
  { value: "filho", label: "Filho" },
  { value: "filha", label: "Filha" },
  { value: "enteado", label: "Enteado(a)" },
  { value: "neto", label: "Neto(a)" },
  { value: "esposa", label: "Esposa / marido" },
  { value: "namorada", label: "Namorada / namorado" },
  { value: "pai_mae", label: "Pai / mãe" },
  { value: "sogro", label: "Sogro(a)" },
  { value: "irmao", label: "Irmão / irmã" },
  { value: "tio", label: "Tio(a)" },
  { value: "primo", label: "Primo(a)" },
  { value: "amigo", label: "Amigo(a)" },
  { value: "outro", label: "Outra pessoa" },
] as const;

export function relationLabel(value: string | null | undefined) {
  return DEPENDENT_RELATIONS.find((item) => item.value === value)?.label ?? "Pessoa";
}

/**
 * Motivos rápidos de gasto com pessoas (filhos, esposa/namorada, mãe, tio,
 * amigo...). Cada motivo aponta para a categoria padrão correspondente — se ela
 * não existir, cai em "Presentes" ou "Filhos".
 */
export const DEPENDENT_REASONS = [
  { value: "ganho_mesada", label: "Recebeu Mesada", category: "Mesada dos pais", icon: "piggy-bank", type: "income" },
  { value: "ganho_presente", label: "Ganhou Presente", category: "Presentes em dinheiro", icon: "gift", type: "income" },
  { value: "ganho_premio", label: "Prêmio / Brinde", category: "Brindes e prêmios", icon: "trophy", type: "income" },
  { value: "venda", label: "Venda de Brinquedo", category: "Venda de brinquedos", icon: "toy-brick", type: "income" },
  { value: "gasto_lanche", label: "Lanche / Sorvete", category: "Gastos da Criança", icon: "ice-cream-cone", type: "expense" },
  { value: "gasto_brinquedo", label: "Comprou Brinquedo", category: "Gastos da Criança", icon: "rocket", type: "expense" },
  { value: "gasto_geral", label: "Outro Gasto", category: "Gastos da Criança", icon: "circle-ellipsis", type: "expense" },
  { value: "ajuda", label: "Ajuda / Doação", category: "Doações", icon: "hand-heart", type: "expense" },
] as const;


export type DependentReason = (typeof DEPENDENT_REASONS)[number]["value"];

/** Marca gravada em `tags` para saber de qual dependente é o gasto. */
export function dependentTag(dependentId: string) {
  return `dependente:${dependentId}`;
}

/** Marca gravada em `tags` com o motivo do gasto com o dependente. */
export function reasonTag(reason: DependentReason) {
  return `motivo:${reason}`;
}

export function dependentIdFromTags(tags: string[] | null | undefined) {
  const found = (tags ?? []).find((tag) => tag.startsWith("dependente:"));
  return found ? found.slice("dependente:".length) : null;
}

export function useDependents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dependents", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Dependent[]> => {
      const { data, error } = await supabase
        .from("dependents")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveDependent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: Partial<Dependent>;
    }): Promise<string> => {

      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("dependents")
          .update(input.values as any)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("dependents")
        .insert({ ...input.values, user_id: user.id } as any)
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dependents"] });
    },
  });
}

export function useDeleteDependent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dependents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dependents"] });
    },
  });
}

/** Idade em anos completos, quando a data de nascimento estiver cadastrada. */
export function dependentAge(dependent: Dependent, reference = new Date()) {
  if (!dependent.birth_date) return null;
  const birth = new Date(`${dependent.birth_date}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}
