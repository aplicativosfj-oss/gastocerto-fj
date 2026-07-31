import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/lib/categories";
import { useTransactions } from "@/lib/transactions";

/** Regras de classificação automática por palavras-chave na descrição. */
export const AUTOFIX_RULES: { category: string; keywords: string[] }[] = [
  {
    category: "Aplicativos e licenças",
    keywords: [
      "netflix",
      "spotify",
      "prime video",
      "amazon prime",
      "disney",
      "hbo",
      "globoplay",
      "youtube premium",
      "deezer",
      "canva",
      "adobe",
      "office 365",
      "microsoft 365",
      "icloud",
      "google one",
      "dropbox",
      "chatgpt",
      "copilot",
      "app store",
      "play store",
      "aplicativo",
      "licenca",
      "licença",
      "software",
      "assinatura digital",
    ],
  },
  { category: "IPVA", keywords: ["ipva"] },
  { category: "Licenciamento", keywords: ["licenciamento", "crlv", "detran"] },
  {
    category: "Seguro do veículo",
    keywords: ["seguro do carro", "seguro do veiculo", "seguro do veículo", "seguro da moto"],
  },
  { category: "Multas", keywords: ["multa", "infracao", "infração"] },
  {
    category: "Medicamentos",
    keywords: ["farmacia", "farmácia", "drogaria", "remedio", "remédio", "medicamento"],
  },
];

export type AutofixSuggestion = {
  id: string;
  description: string;
  amount: number;
  date: string;
  currentCategory: string;
  targetCategory: string;
  targetCategoryId: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Detecta lançamentos de aplicativos/licenças, IPVA, licenciamento e afins que
 * ficaram sem categoria ou em categoria genérica, para corrigir de uma vez.
 */
export function useCategoryAutofix() {
  const { data: categories } = useCategories();
  const { data: transactions } = useTransactions();

  const suggestions = useMemo<AutofixSuggestion[]>(() => {
    if (!categories || !transactions) return [];
    const expenseCategories = categories.filter((item) => item.type === "expense");
    const byName = new Map(expenseCategories.map((item) => [normalize(item.name), item]));
    const nameById = new Map(categories.map((item) => [item.id, item.name]));
    const genericNames = new Set(["outros", "assinaturas", "veiculos", "veículos", "impostos"]);

    const list: AutofixSuggestion[] = [];
    transactions.forEach((transaction) => {
      if (transaction.transaction_type !== "expense") return;
      const description = normalize(transaction.description ?? "");
      if (!description) return;

      const rule = AUTOFIX_RULES.find((item) =>
        item.keywords.some((keyword) => description.includes(normalize(keyword))),
      );
      if (!rule) return;

      const target = byName.get(normalize(rule.category));
      if (!target || target.id === transaction.category_id) return;

      const currentName = transaction.category_id
        ? (nameById.get(transaction.category_id) ?? "Sem categoria")
        : "Sem categoria";
      // Só sugere troca quando a categoria atual é ausente ou genérica.
      if (transaction.category_id && !genericNames.has(normalize(currentName))) return;

      list.push({
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        date: transaction.transaction_date,
        currentCategory: currentName,
        targetCategory: target.name,
        targetCategoryId: target.id,
      });
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [categories, transactions]);

  return suggestions;
}

export function useApplyCategoryAutofix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: AutofixSuggestion[]) => {
      let applied = 0;
      const blocked: string[] = [];
      for (const item of items) {
        const { error } = await supabase
          .from("transactions")
          .update({ category_id: item.targetCategoryId })
          .eq("id", item.id);
        if (error) blocked.push(item.description);
        else applied += 1;
      }
      return { applied, blocked };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_closings"] });
    },
  });
}
