import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getAiProvider,
  isVercelRuntime,
  isSubscriptionProviderAvailable,
} from "@/lib/ai-config"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const provider = getAiProvider()
  const onVercel = isVercelRuntime()
  const subscriptionAvailable = isSubscriptionProviderAvailable()

  let claudeStatus:
    | { hasLogin: boolean; path: string; reason?: string }
    | null = null

  if (provider === "claude-subscription" && subscriptionAvailable) {
    const { checkClaudeLogin } = await import("@/lib/claude-auth")
    claudeStatus = checkClaudeLogin()
  }

  return (
    <SettingsClient
      provider={provider}
      onVercel={onVercel}
      subscriptionAvailable={subscriptionAvailable}
      claudeStatus={claudeStatus}
      hasApiKey={Boolean(process.env.ANTHROPIC_API_KEY)}
      userEmail={session.user.email ?? ""}
    />
  )
}
