import { existsSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/**
 * Detecta se `claude login` (CLI Anthropic) foi executado nesta máquina.
 *
 * Origem: o pacote `@anthropic-ai/claude-agent-sdk` autentica via tokens
 * OAuth gravados em `~/.claude/.credentials.json` quando o user roda
 * `claude login`. Sem esse arquivo, o SDK falha com erro de auth.
 *
 * Uso típico (apenas em runtime Node — Vercel serverless não tem acesso ao
 * home do user, então o caller deve checar `process.env.VERCEL` antes).
 */

export const CLAUDE_CREDENTIALS_PATH = join(
  homedir(),
  ".claude",
  ".credentials.json",
)

export type ClaudeAuthStatus = {
  hasLogin: boolean
  path: string
  reason?: "missing" | "empty" | "invalid"
}

export function checkClaudeLogin(): ClaudeAuthStatus {
  const status: ClaudeAuthStatus = { hasLogin: false, path: CLAUDE_CREDENTIALS_PATH }

  if (!existsSync(CLAUDE_CREDENTIALS_PATH)) {
    return { ...status, reason: "missing" }
  }
  try {
    const stat = statSync(CLAUDE_CREDENTIALS_PATH)
    if (stat.size === 0) return { ...status, reason: "empty" }
    JSON.parse(readFileSync(CLAUDE_CREDENTIALS_PATH, "utf8"))
    return { hasLogin: true, path: CLAUDE_CREDENTIALS_PATH }
  } catch {
    return { ...status, reason: "invalid" }
  }
}
