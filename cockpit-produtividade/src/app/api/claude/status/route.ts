import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAiProvider, isVercelRuntime, isSubscriptionProviderAvailable } from "@/lib/ai-config"

/**
 * Status do provedor de IA configurado.
 *
 * - Em dev local: pode ler `~/.claude/.credentials.json` se subscription provider
 * - Em Vercel: subscription não é suportado, retorna ready se ANTHROPIC_API_KEY existe
 *
 * Não expõe nada sensível (path do home não tem PII relevante).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const provider = getAiProvider()
  const onVercel = isVercelRuntime()

  if (provider === "claude-subscription" && isSubscriptionProviderAvailable()) {
    // Lazy import — só puxa o módulo de fs quando faz sentido
    const { checkClaudeLogin } = await import("@/lib/claude-auth")
    const status = checkClaudeLogin()
    return NextResponse.json({
      provider,
      onVercel,
      ready: status.hasLogin,
      hasLogin: status.hasLogin,
      reason: status.reason,
      path: status.path,
    })
  }

  // claude-api path
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)
  return NextResponse.json({
    provider,
    onVercel,
    ready: hasApiKey,
    hasApiKey,
    subscriptionAvailable: isSubscriptionProviderAvailable(),
  })
}
