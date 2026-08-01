/**
 * Limites configuráveis do Consultor de IA (rate limiting, cota mensal e
 * threshold do alerta de créditos). São editáveis pelo administrador e ficam
 * guardados em `app_settings.key = 'ai_limits'`.
 *
 * Este módulo é puro para poder ser testado e usado no cliente e no servidor.
 */

import { z } from "zod";

export type AiLimits = {
  /** Janela curta de rate limiting, em segundos. */
  rateWindowSeconds: number;
  /** Máximo de tentativas dentro da janela curta. */
  rateMaxInWindow: number;
  /** Janela longa (anti-burst), em segundos. */
  burstWindowSeconds: number;
  /** Máximo de tentativas dentro da janela longa. */
  rateMaxInBurstWindow: number;
  /** Consultas permitidas por mês. */
  monthlyQueryLimit: number;
  /** Créditos estimados permitidos por mês. */
  monthlyCreditAllowance: number;
  /** Fração restante que dispara o alerta de créditos baixos (0–1). */
  lowCreditRatio: number;
  /** Modo econômico: usa modelos mais leves ou instruções mais curtas. */
  economyMode: boolean;
  /** Máximo de créditos permitidos para Gemini por usuário por mês. */
  geminiMonthlyCreditLimit: number;
};

export const AI_LIMITS_SETTING_KEY = "ai_limits";

export const DEFAULT_AI_LIMITS: AiLimits = {
  rateWindowSeconds: 60,
  rateMaxInWindow: 5,
  burstWindowSeconds: 3600,
  rateMaxInBurstWindow: 30,
  monthlyQueryLimit: 120,
  monthlyCreditAllowance: 50,
  lowCreditRatio: 0.2,
  economyMode: false,
  geminiMonthlyCreditLimit: 50,
};

export const AiLimitsSchema = z.object({
  rateWindowSeconds: z.coerce.number().int().min(5).max(3600),
  rateMaxInWindow: z.coerce.number().int().min(1).max(200),
  burstWindowSeconds: z.coerce.number().int().min(60).max(86_400),
  rateMaxInBurstWindow: z.coerce.number().int().min(1).max(5000),
  monthlyQueryLimit: z.coerce.number().int().min(1).max(100_000),
  monthlyCreditAllowance: z.coerce.number().min(0.1).max(100_000),
  lowCreditRatio: z.coerce.number().min(0.01).max(0.9),
  economyMode: z.boolean().default(false),
  geminiMonthlyCreditLimit: z.coerce.number().min(0.1).max(500),
});

/** Normaliza qualquer valor vindo do banco/formulário para limites válidos. */
export function normalizeAiLimits(value: unknown): AiLimits {
  const merged = { ...DEFAULT_AI_LIMITS, ...(typeof value === "object" && value ? value : {}) };
  const parsed = AiLimitsSchema.safeParse(merged);
  if (!parsed.success) return DEFAULT_AI_LIMITS;

  const limits = parsed.data;
  // A janela longa nunca pode ser menor que a curta, nem permitir menos tentativas.
  return {
    ...limits,
    burstWindowSeconds: Math.max(limits.burstWindowSeconds, limits.rateWindowSeconds),
    rateMaxInBurstWindow: Math.max(limits.rateMaxInBurstWindow, limits.rateMaxInWindow),
  };
}