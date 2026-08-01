import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin-guard";
import {
  CATEGORY_CATALOG_KEY,
  CatalogSchema,
  dedupeCatalog,
  type CatalogItem,
} from "@/lib/categories-catalog";

/** Catálogo atual de categorias padrão (somente administradores). */
export const getCategoryCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", CATEGORY_CATALOG_KEY)
      .maybeSingle();

    const parsed = CatalogSchema.safeParse(data?.value ?? []);
    return dedupeCatalog(parsed.success ? parsed.data : []);
  });

/** Administrador insere, edita ou exclui categorias do catálogo padrão. */
export const saveCategoryCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CatalogSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const catalog: CatalogItem[] = dedupeCatalog(data);
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: CATEGORY_CATALOG_KEY,
        value: catalog,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error("Não foi possível salvar o catálogo de categorias");

    await supabase.from("admin_logs").insert({
      actor_id: userId,
      action: "update_category_catalog",
      details: { total: catalog.length },
    });

    return catalog;
  });

/** Aplica o catálogo a todos os usuários, criando apenas o que está faltando. */
export const applyCategoryCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin.from("profiles").select("user_id");
    if (error) throw new Error("Não foi possível listar os usuários");

    let applied = 0;
    for (const profile of profiles ?? []) {
      const { error: rpcError } = await supabaseAdmin.rpc("create_default_categories", {
        _user_id: profile.user_id,
      });
      if (!rpcError) applied += 1;
    }

    await supabase.from("admin_logs").insert({
      actor_id: userId,
      action: "apply_category_catalog",
      details: { users: applied },
    });

    return { users: applied };
  });
