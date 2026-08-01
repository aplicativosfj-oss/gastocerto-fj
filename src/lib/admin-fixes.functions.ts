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
