/** Catálogo de categorias padrão editável pelo administrador. */
import { z } from "zod";

export const CATEGORY_CATALOG_KEY = "category_catalog";

export const CatalogItemSchema = z.object({
  name: z.string().trim().min(2).max(40),
  type: z.enum(["expense", "income"]),
  icon: z.string().trim().min(1).max(40).default("circle-ellipsis"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
    .default("#94a3b8"),
});

export const CatalogSchema = z.array(CatalogItemSchema).max(300);

export type CatalogItem = z.infer<typeof CatalogItemSchema>;

/** Remove duplicidades (mesmo nome + tipo) preservando a primeira ocorrência. */
export function dedupeCatalog(items: CatalogItem[]): CatalogItem[] {
  const seen = new Set<string>();
  const result: CatalogItem[] = [];
  for (const item of items) {
    const key = `${item.type}|${item.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...item, name: item.name.trim() });
  }
  return result.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "pt-BR"));
}
