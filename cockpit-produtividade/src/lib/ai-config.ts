/**
 * Helpers de configuração do provedor de IA.
 *
 * Dois modos:
 * - `claude-api` (default): usa `ANTHROPIC_API_KEY` via `@anthropic-ai/sdk`.
 *   Cobra por token. Funciona em qualquer ambiente (local + Vercel).
 *
 * - `claude-subscription`: usa `@anthropic-ai/claude-agent-sdk` que lê
 *   tokens OAuth de `~/.claude/.credentials.json` (gerados por `claude login`
 *   na CLI da Anthropic). Consome da subscription Claude Pro/Max do user em
 *   vez de gastar tokens API. **Só funciona local** — Vercel serverless
 *   não tem acesso ao home do user em runtime.
 *
 * Modo é controlado via env `AI_PROVIDER`. Default `claude-api`.
 * Em Vercel, qualquer outro valor é ignorado e cai pra `claude-api`.
 */

export type AiProvider = "claude-api" | "claude-subscription"

export const isVercelRuntime = (): boolean =>
  process.env.VERCEL === "1" || process.env.VERCEL === "true"

export function getAiProvider(): AiProvider {
  const env = process.env.AI_PROVIDER?.trim()
  if (env === "claude-subscription" && !isVercelRuntime()) {
    return "claude-subscription"
  }
  return "claude-api"
}

/**
 * `claude-subscription` só faz sentido em runtime Node local. Use isto antes
 * de mostrar o toggle/instructions no UI de settings.
 */
export const isSubscriptionProviderAvailable = (): boolean => !isVercelRuntime()
