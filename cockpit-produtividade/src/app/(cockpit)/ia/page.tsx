import { auth } from "@/lib/auth"
import { getAiInsights } from "@/services/ai.service"
import { MotorIAClient } from "./MotorIAClient"

export default async function MotorIAPage() {
  const session = await auth()
  const insights = await getAiInsights(session?.user?.id!)
  return <MotorIAClient initialInsights={insights} />
}
