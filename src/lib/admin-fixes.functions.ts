import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const fixNexxusTransaction = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ userId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Localizando a categoria de Software/Assinaturas
    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id")
      .or("name.ilike.%Assinaturas%,name.ilike.%Software%")
      .limit(1);

    const categoryId = categories?.[0]?.id ?? null;

    const { data: updated, error } = await supabaseAdmin
      .from("transactions")
      .update({
        description: 'ASSINATURA NEXXUS (15 DIAS) - LOVABLE',
        notes: 'Licença de software para desenvolvimento Lovable.',
        is_essential: true,
        category_id: categoryId,
        merchant_name: 'NEXXUS / LOVABLE'
      })
      .match({
        user_id: data.userId,
        merchant_name: 'JHONATAN GOMES FERREIRA',
        amount: 94.50,
        transaction_date: '2026-07-29'
      })
      .select();

    if (error) throw error;
    return { success: true, count: updated?.length ?? 0 };
  });

export const fixComplexAdjustments = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ userId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const results = {
      movedRevenues: 0,
      correctedExpense262: 0,
      nexxusCount: 0
    };

    // 1. Transferir receitas de final de julho para agosto
    // Motivo: Pagamento da prefeitura/estado cai no fim do mês mas é usado em agosto.
    const { data: revenues } = await supabaseAdmin
      .from("transactions")
      .update({ transaction_date: '2026-08-01', notes: 'Transferido para Agosto (Receita de fim de mês)' })
      .match({ 
        user_id: data.userId, 
        transaction_type: 'income' 
      })
      .gte('transaction_date', '2026-07-25')
      .lte('transaction_date', '2026-07-31')
      .select();
    
    results.movedRevenues = revenues?.length ?? 0;

    // 2. Corrigir o gasto de R$ 262 que "não foi feito hoje" (01/08)
    const { data: expense262 } = await supabaseAdmin
      .from("transactions")
      .update({ 
        transaction_date: '2026-07-31', 
        notes: 'Data corrigida: não foi gasto em 01/08' 
      })
      .match({ 
        user_id: data.userId, 
        amount: 262.00,
        transaction_date: '2026-08-01'
      })
      .select();

    results.correctedExpense262 = expense262?.length ?? 0;

    return results;
  });
