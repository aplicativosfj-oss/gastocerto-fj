import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Dependent = Tables<"dependents">;

export const DEPENDENT_RELATIONS = [
  { value: "filho", label: "Filho" },
  { value: "filha", label: "Filha" },
  { value: "enteado", label: "Enteado(a)" },
  { value: "neto", label: "Neto(a)" },
  { value: "pai_mae", label: "Pai / mãe" },
  { value: "outro", label: "Outro dependente" },
] as const;

export function relationLabel(value: string | null | undefined) {
  return DEPENDENT_RELATIONS.find((item) => item.value === value)?.label ?? "Dependente";
}

/**
 * Motivos rápidos de gasto com filhos/dependentes. Cada motivo aponta para a
 * categoria padrão correspondente — se ela não existir, cai em "Filhos".
 */
export const DEPENDENT_REASONS = [
  { value: "pix", label: "Pix / dinheiro", category: "Pix para filhos", icon: "send" },
  { value: "mesada", label: "Mesada", category: "Mesada", icon: "piggy-bank" },
  { value: "lanche", label: "Lanche / sorvete", category: "Lazer com filhos", icon: "ice-cream-cone" },
  { value: "presente", label: "Presente / aniversário", category: "Presentes e aniversários", icon: "cake" },
  { value: "material", label: "Material didático", category: "Material didático", icon: "book-open" },
  { value: "escola", label: "Escola / mensalidade", category: "Educação", icon: "graduation-cap" },
  { value: "roupa", label: "Roupa / calçado", category: "Roupas", icon: "shirt" },
  { value: "saude", label: "Saúde / remédio", category: "Saúde", icon: "heart-pulse" },
  { value: "transporte", label: "Transporte", category: "Transporte", icon: "bus" },
  { value: "pensao", label: "Pensão alimentícia", category: "Filhos", icon: "baby" },
  { value: "outro", label: "Outro gasto", category: "Filhos", icon: "circle-ellipsis" },
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
      values: Omit<TablesInsert<"dependents">, "user_id">;
    }): Promise<string> => {
      if (!user) throw new Error("Sessão expirada");
      if (input.id) {
        const { error } = await supabase
          .from("dependents")
          .update(input.values)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("dependents")
        .insert({ ...input.values, user_id: user.id })
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
