/**
 * Rate limiting com base no model `ApiUsage` (Postgres).
 *
 * Por que DB-based em vez de in-memory:
 * - Vercel serverless: cada cold start zera in-memory state — useless
 * - DB-based: trabalha cross-invocation, sobrevive a deploys
 * - Custo: 1 query por check (sub-10ms com index `[userId, createdAt]`)
 *
 * Limites são aplicados ANTES da call LLM. Se passar, só registra normalmente
 * via `trackUsage` (que já existe em ai.service.ts).
 */

import { db } from "@/lib/db"

export type RateLimitConfig = {
  /** Calls permitidas em 60 segundos */
  perMinute?: number
  /** Calls permitidas em 24h (rolling window) */
  perDay?: number
}

export type RateLimitResult =
  | { ok: true }
  | {
      ok: false
      reason: "minute" | "day"
      limit: number
      currentCount: number
      retryAfterSeconds: number
    }

const DEFAULTS: Required<RateLimitConfig> = {
  perMinute: 5,
  perDay: 200,
}

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = {},
): Promise<RateLimitResult> {
  const { perMinute, perDay } = { ...DEFAULTS, ...config }
  const now = Date.now()
  const minuteAgo = new Date(now - 60_000)
  const dayAgo = new Date(now - 86_400_000)

  const [minuteCount, dayCount] = await Promise.all([
    db.apiUsage.count({
      where: { userId, createdAt: { gte: minuteAgo } },
    }),
    db.apiUsage.count({
      where: { userId, createdAt: { gte: dayAgo } },
    }),
  ])

  if (minuteCount >= perMinute) {
    return {
      ok: false,
      reason: "minute",
      limit: perMinute,
      currentCount: minuteCount,
      retryAfterSeconds: 60,
    }
  }

  if (dayCount >= perDay) {
    return {
      ok: false,
      reason: "day",
      limit: perDay,
      currentCount: dayCount,
      retryAfterSeconds: 3600,
    }
  }

  return { ok: true }
}

export function rateLimitErrorMessage(result: Extract<RateLimitResult, { ok: false }>): string {
  if (result.reason === "minute") {
    return `Muitas chamadas seguidas (${result.currentCount}/${result.limit} no último minuto). Tenta de novo em ~1 minuto.`
  }
  return `Limite diário atingido (${result.currentCount}/${result.limit} em 24h). Tenta de novo amanhã ou aumente o limite em src/lib/rate-limit.ts.`
}
