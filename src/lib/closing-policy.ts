/**
 * Política global de fechamento definida pelo administrador e guardada em
 * `app_settings.key = 'closing_policy'`.
 *
 * Módulo puro: usado no cliente (para bloquear a interface) e no servidor
 * (para validar antes de gravar). O banco também valida no trigger
 * `enforce_transaction_period`, então a regra vale mesmo fora do app.
 */

import { z } from "zod";

export const CLOSING_POLICY_SETTING_KEY = "closing_policy";

export type ClosingPolicy = {
  /** Quando ativo, clientes não podem inserir/editar lançamentos de meses anteriores. */
  lockPastMonths: boolean;
  /** Quando ativo, editar um lançamento de mês anterior exige a senha do usuário. */
  requirePasswordForPastEdits: boolean;
  /** Aviso opcional mostrado ao cliente quando o bloqueio estiver ativo. */
  notice: string;
};

export const DEFAULT_CLOSING_POLICY: ClosingPolicy = {
  lockPastMonths: false,
  requirePasswordForPastEdits: true,
  notice: "",
};

export const ClosingPolicySchema = z.object({
  lockPastMonths: z.coerce.boolean(),
  requirePasswordForPastEdits: z.coerce.boolean(),
  notice: z.string().max(300).default(""),
});

/** Normaliza qualquer valor vindo do banco/formulário para uma política válida. */
export function normalizeClosingPolicy(value: unknown): ClosingPolicy {
  const merged = {
    ...DEFAULT_CLOSING_POLICY,
    ...(typeof value === "object" && value ? (value as Partial<ClosingPolicy>) : {}),
  };
  const parsed = ClosingPolicySchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_CLOSING_POLICY;
}

/** Verdadeiro quando a data (ISO) pertence a uma competência anterior à atual. */
export function isPastCompetence(isoDateValue: string, reference = new Date()): boolean {
  if (!isoDateValue) return false;
  const current = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
  return isoDateValue.slice(0, 7) < current;
}
