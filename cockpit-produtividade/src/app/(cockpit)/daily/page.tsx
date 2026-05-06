import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDailyDigest, getReflectionPrompt } from "@/services/daily.service"
import { DailyClient } from "./DailyClient"

export default async function DailyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const digest = await getDailyDigest(session.user.id)
  const prompt = getReflectionPrompt()

  return (
    <DailyClient
      digest={digest}
      reflectionPrompt={prompt}
      userName={session.user.name?.split(" ")[0] ?? "você"}
    />
  )
}
