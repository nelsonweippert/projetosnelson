"use server"

import { auth } from "@/lib/auth"
import { generateWeeklyReview, generateModuleInsight, getAiInsights, reactToInsight } from "@/services/ai.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function generateWeeklyReviewAction(): Promise<ActionResult<string>> {
  try {
    const userId = await getUserId()
    const review = await generateWeeklyReview(userId)
    return { success: true, data: review }
  } catch (e) {
    return { success: false, error: "Erro ao gerar revisão semanal" }
  }
}

export async function generateModuleInsightAction(module: "tasks" | "finance" | "studies" | "content"): Promise<ActionResult<string>> {
  try {
    const userId = await getUserId()
    const insight = await generateModuleInsight(userId, module)
    return { success: true, data: insight }
  } catch {
    return { success: false, error: "Erro ao gerar insight" }
  }
}

export async function getAiInsightsAction(): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const insights = await getAiInsights(userId)
    return { success: true, data: insights }
  } catch {
    return { success: false, error: "Erro ao buscar insights" }
  }
}

export async function reactToInsightAction(id: string, reaction: string): Promise<ActionResult> {
  try {
    await getUserId()
    const insight = await reactToInsight(id, reaction)
    return { success: true, data: insight }
  } catch {
    return { success: false, error: "Erro ao reagir ao insight" }
  }
}
