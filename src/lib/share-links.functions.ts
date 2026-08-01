import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  label: z.string().trim().max(80).optional(),
  password: z.string().min(4).max(64),
  year: z.number().int().min(2026).max(2100),
  month: z.number().int().min(1).max(12),
  includeTransactions: z.boolean().default(true),
  includeNotes: z.boolean().default(false),
  expiresInDays: z.number().int().min(1).max(365).nullable().default(7),
});

const openSchema = z.object({
  token: z.string().trim().min(6).max(40),
  password: z.string().min(1).max(64),
});

export type SharePayload = {
  label: string | null;
  ownerName: string | null;
  year: number;
  month: number;
  expiresAt: string | null;
  totals: { income: number; expense: number; balance: number; count: number };
  categories: { name: string; total: number }[];
  transactions: {
    id: string;
    date: string;
    description: string;
    category: string | null;
    merchant: string | null;
    amount: number;
    type: string;
    notes: string | null;
  }[];
};

/** Cria um link compartilhado protegido por senha para um mês específico. */
export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { hashSharePassword, generateShareToken } = await import("./share-hash.server");
    const { hash, salt } = await hashSharePassword(data.password);
    const token = generateShareToken();
    const expiresAt =
      data.expiresInDays === null
        ? null
        : new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString();

    const { data: row, error } = await context.supabase
      .from("share_links")
      .insert({
        user_id: context.userId,
        token,
        password_hash: hash,
        password_salt: salt,
        label: data.label ?? null,
        year: data.year,
        month: data.month,
        include_transactions: data.includeTransactions,
        include_notes: data.includeNotes,
        expires_at: expiresAt,
      })
      .select("id, token, expires_at")
      .single();

    if (error) throw error;
    return row;
  });

/** Abre o link público: valida a senha no servidor e devolve somente leitura. */
export const openShareLink = createServerFn({ method: "POST" })
  .inputValidator((data) => openSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: false; reason: string } | { ok: true; payload: SharePayload }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifySharePassword } = await import("./share-hash.server");

    const { data: link } = await supabaseAdmin
      .from("share_links")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();

    if (!link) return { ok: false as const, reason: "Link inválido ou removido." };
    if (link.revoked_at) return { ok: false as const, reason: "Este link foi revogado pelo dono." };
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return { ok: false as const, reason: "Este link expirou." };
    }

    const valid = await verifySharePassword(data.password, link.password_hash, link.password_salt);
    if (!valid) return { ok: false as const, reason: "Senha incorreta." };

    const start = `${link.year}-${String(link.month).padStart(2, "0")}-01`;
    const endDate = new Date(link.year, link.month, 0);
    const end = `${link.year}-${String(link.month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

    const [{ data: rows }, { data: categories }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("transactions")
        .select(
          "id, description, amount, transaction_type, transaction_date, merchant_name, notes, category_id",
        )
        .eq("user_id", link.user_id)
        .is("deleted_at", null)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: false }),
      supabaseAdmin.from("categories").select("id, name").eq("user_id", link.user_id),
      supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("user_id", link.user_id)
        .maybeSingle(),
    ]);

    const categoryName = new Map((categories ?? []).map((item) => [item.id, item.name]));
    const list = rows ?? [];

    const income = list
      .filter((item) => item.transaction_type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = list
      .filter((item) => item.transaction_type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const byCategory = new Map<string, number>();
    for (const item of list) {
      if (item.transaction_type !== "expense") continue;
      const name = (item.category_id && categoryName.get(item.category_id)) || "Sem categoria";
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(item.amount));
    }

    await supabaseAdmin
      .from("share_links")
      .update({ view_count: link.view_count + 1, last_viewed_at: new Date().toISOString() })
      .eq("id", link.id);

    return {
      ok: true as const,
      payload: {
        label: link.label,
        ownerName: profile?.full_name ?? null,
        year: link.year,
        month: link.month,
        expiresAt: link.expires_at,
        totals: { income, expense, balance: income - expense, count: list.length },
        categories: Array.from(byCategory, ([name, total]) => ({ name, total })).sort(
          (a, b) => b.total - a.total,
        ),
        transactions: link.include_transactions
          ? list.map((item) => ({
              id: item.id,
              date: item.transaction_date,
              description: item.description,
              category: (item.category_id && categoryName.get(item.category_id)) || null,
              merchant: item.merchant_name,
              amount: Number(item.amount),
              type: item.transaction_type,
              notes: link.include_notes ? item.notes : null,
            }))
          : [],
      },
    };
  });
