/** Helpers puros para a trilha de auditoria administrativa. */

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_id: string;
  target_user_id: string | null;
  action: string;
  details: unknown;
};

export type AuditCategory = "codes" | "permissions" | "plans" | "users" | "sales" | "other";

const CATEGORY_RULES: Array<{ category: AuditCategory; test: RegExp }> = [
  { category: "codes", test: /(code|codigo|código|license|licen|key|chave)/i },
  { category: "permissions", test: /(role|permiss|papel|admin_access|grant|revoke_role)/i },
  { category: "plans", test: /(plan|price|preco|preço|announc|aviso|setting)/i },
  { category: "users", test: /(user|usuario|usuário|profile|status|pin|support_note)/i },
  { category: "sales", test: /(sale|payment|venda|pagamento|receita|billing|checkout)/i },
];

export function categorizeAction(action: string): AuditCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(action)) return rule.category;
  }
  return "other";
}

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  codes: "Códigos e licenças",
  permissions: "Permissões",
  plans: "Planos e avisos",
  users: "Usuários",
  sales: "Vendas e pagamentos",
  other: "Outros",
};

export type AuditFilters = {
  from?: string | null;
  to?: string | null;
  category?: AuditCategory | "all";
  search?: string;
};

/** Filtra registros por período (datas YYYY-MM-DD inclusivas), categoria e busca livre. */
export function filterAuditLogs<T extends AuditLogRow>(rows: T[], filters: AuditFilters): T[] {
  const term = (filters.search ?? "").trim().toLowerCase();
  const fromTime = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const toTime = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : null;

  return rows.filter((row) => {
    const time = new Date(row.created_at).getTime();
    if (fromTime !== null && time < fromTime) return false;
    if (toTime !== null && time > toTime) return false;
    if (filters.category && filters.category !== "all") {
      if (categorizeAction(row.action) !== filters.category) return false;
    }
    if (term) {
      const haystack = `${row.action} ${JSON.stringify(row.details ?? {})}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Monta o CSV dos logs de auditoria, com nomes resolvidos quando disponíveis. */
export function auditLogsToCsv(
  rows: AuditLogRow[],
  nameByUser: Map<string, string> = new Map(),
): string {
  const header = ["Data/Hora", "Categoria", "Ação", "Responsável", "Usuário afetado", "Detalhes"];
  const lines = rows.map((row) =>
    [
      new Date(row.created_at).toLocaleString("pt-BR"),
      AUDIT_CATEGORY_LABELS[categorizeAction(row.action)],
      row.action,
      nameByUser.get(row.actor_id) ?? row.actor_id,
      row.target_user_id ? (nameByUser.get(row.target_user_id) ?? row.target_user_id) : "—",
      JSON.stringify(row.details ?? {}),
    ]
      .map(csvCell)
      .join(";"),
  );
  return [header.map(csvCell).join(";"), ...lines].join("\n");
}

/** Rótulo humano do período selecionado, usado nos cabeçalhos de exportação. */
export function periodLabel(from?: string | null, to?: string | null): string {
  const fmt = (value: string) => value.split("-").reverse().join("/");
  if (from && to) return `${fmt(from)} a ${fmt(to)}`;
  if (from) return `a partir de ${fmt(from)}`;
  if (to) return `até ${fmt(to)}`;
  return "todo o histórico";
}

/** Tempo restante legível com atualização por segundo. */
export function remainingTime(expiresAt: string | null, now: number = Date.now()) {
  if (!expiresAt) return { text: "Sem validade definida", tone: "neutral" as const, expired: false };
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return { text: "Expirada", tone: "expired" as const, expired: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const tone = diff <= 5 * 86_400_000 ? ("soon" as const) : ("ok" as const);
  if (days > 0) return { text: `${days}d ${hours}h ${minutes}m restantes`, tone, expired: false };
  if (hours > 0) return { text: `${hours}h ${minutes}m restantes`, tone: "soon" as const, expired: false };
  return { text: `${minutes}m ${seconds}s restantes`, tone: "soon" as const, expired: false };
}
