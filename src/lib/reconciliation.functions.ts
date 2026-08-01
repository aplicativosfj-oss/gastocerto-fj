import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Regra automática para receitas de final de mês (Prefeitura/Estado).
 * Detecta receitas entre dia 25 e o fim do mês e sugere transferência para o mês seguinte.
 */
export const suggestRevenueTransfer = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ userId: z.string(), date: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const date = new Date(data.date);
    const day = date.getDate();
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    // Se estiver nos últimos dias do mês
    if (day >= 25 && day <= lastDayOfMonth) {
      return { 
        shouldSuggest: true, 
        message: "Esta receita parece ser de final de mês (Prefeitura/Estado). Deseja registrar para o próximo mês para facilitar o pagamento das contas?",
        suggestedDate: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString().split('T')[0]
      };
    }
    return { shouldSuggest: false };
  });

/**
 * Lógica para reconciliação mensal de receitas transferidas.
 */
export const getReconciliationData = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ userId: z.string(), year: z.number(), month: z.number() }).parse(data))
  .handler(async ({ data }) => {
    // Busca receitas marcadas como transferidas para este mês (que vieram do mês anterior)
    const { data: transferredIn } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", data.userId)
      .eq("transaction_type", "income")
      .ilike("notes", "%Transferido para Agosto%") // Ou um padrão genérico
      .gte("transaction_date", `${data.year}-${String(data.month).padStart(2, '0')}-01`)
      .lte("transaction_date", `${data.year}-${String(data.month).padStart(2, '0')}-05`);

    return { 
      transferredIn: transferredIn || [],
      totalTransferred: (transferredIn || []).reduce((acc, t) => acc + Number(t.amount), 0)
    };
  });
