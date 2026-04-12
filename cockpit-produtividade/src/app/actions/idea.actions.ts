"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

// ── Monitor Terms ───────────────────────────────────────────────────────

export async function getMonitorTermsAction(): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const terms = await db.monitorTerm.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    return { success: true, data: terms }
  } catch { return { success: false, error: "Erro ao buscar termos" } }
}

export async function addMonitorTermAction(term: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const created = await db.monitorTerm.create({ data: { term, userId } })
    revalidatePath("/conteudo")
    return { success: true, data: created }
  } catch { return { success: false, error: "Erro ao adicionar termo" } }
}

export async function toggleMonitorTermAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.monitorTerm.update({ where: { id, userId }, data: { isActive } })
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao atualizar termo" } }
}

export async function deleteMonitorTermAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.monitorTerm.delete({ where: { id, userId } })
    revalidatePath("/conteudo")
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao remover termo" } }
}

// ── Idea Feed ───────────────────────────────────────────────────────────

export async function getIdeasAction(): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const ideas = await db.ideaFeed.findMany({
      where: { userId, isDiscarded: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return { success: true, data: ideas }
  } catch { return { success: false, error: "Erro ao buscar ideias" } }
}

export async function discardIdeaAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.ideaFeed.update({ where: { id, userId }, data: { isDiscarded: true } })
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao descartar ideia" } }
}

export async function markIdeaUsedAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.ideaFeed.update({ where: { id, userId }, data: { isUsed: true } })
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro" } }
}

export async function generateIdeasNowAction(): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const terms = await db.monitorTerm.findMany({ where: { userId, isActive: true } })
    if (terms.length === 0) return { success: false, error: "Adicione termos de monitoramento primeiro" }

    const { generateContentSuggestion } = await import("@/services/ai.service")

    const allTerms = terms.map((t) => t.term).join(", ")
    const prompt = `Você é um pesquisador de tendências de conteúdo digital.

Termos monitorados: ${allTerms}

Pesquise as tendências, notícias e assuntos mais quentes e relevantes AGORA sobre esses temas.
Gere 10 ideias de conteúdo baseadas em novidades REAIS e tendências ATUAIS.

Retorne APENAS um JSON array (sem markdown, sem code blocks):
[{
  "title": "título da ideia",
  "summary": "resumo em 2-3 frases do que trata e por que é relevante agora",
  "angle": "ângulo único para abordar este tema",
  "hook": "sugestão de hook para os primeiros segundos",
  "term": "termo monitorado principal relacionado",
  "relevance": "por que é tendência agora (dado, contexto ou timing)"
}]`

    const result = await generateContentSuggestion(
      "Você é um pesquisador de tendências. Retorne APENAS JSON válido, sem markdown.",
      prompt
    )

    const ideas = JSON.parse(result.replace(/```json?\n?/g, "").replace(/```/g, "").trim())

    const created = await db.ideaFeed.createMany({
      data: ideas.map((idea: any) => ({
        title: idea.title,
        summary: idea.summary,
        angle: idea.angle || null,
        hook: idea.hook || null,
        term: idea.term || allTerms,
        relevance: idea.relevance || null,
        source: "ai_generated",
        userId,
      })),
    })

    revalidatePath("/conteudo")
    return { success: true, data: { count: created.count } }
  } catch (err) {
    console.error("[generateIdeasNow]", err)
    return { success: false, error: "Erro ao gerar ideias" }
  }
}
