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

export async function addMonitorTermAction(term: string, intent?: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const created = await db.monitorTerm.create({
      data: { term, intent: intent?.trim() || null, userId },
    })
    revalidatePath("/conteudo")
    return { success: true, data: created }
  } catch { return { success: false, error: "Erro ao adicionar termo" } }
}

export async function updateMonitorTermIntentAction(id: string, intent: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const clean = intent.trim()
    await db.monitorTerm.update({
      where: { id, userId },
      data: { intent: clean.length > 0 ? clean : null },
    })
    revalidatePath("/conteudo")
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao atualizar intenção" } }
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

    const { generateIdeasWithResearch } = await import("@/services/ai.service")
    const termNames = terms.map((t) => t.term)

    const { ideas, usage } = await generateIdeasWithResearch({
      terms: termNames,
      ideasPerTerm: 2,
      hoursWindow: 72,
      language: "both",
      userId,
    })

    if (ideas.length === 0) {
      return { success: false, error: "Nenhuma notícia relevante encontrada nas últimas 72h para os termos monitorados. Tente ampliar os termos ou voltar mais tarde." }
    }

    const created = await db.ideaFeed.createMany({
      data: ideas.map((idea) => ({
        title: idea.title,
        summary: idea.summary,
        angle: idea.angle,
        hook: idea.hook,
        term: idea.term,
        relevance: idea.relevance,
        source: idea.sourceTitle,
        sourceUrl: idea.sourceUrl,
        publishedAt: idea.publishedAt ? new Date(idea.publishedAt) : null,
        language: idea.language ?? "pt-BR",
        pioneerScore: idea.pioneerScore,
        evidenceId: idea.evidenceId,
        evidenceQuote: idea.evidenceQuote,
        supportingEvidenceIds: idea.supportingEvidenceIds,
        viralScore: idea.viralScore,
        publisherHosts: idea.publisherHosts,
        hasInternationalCoverage: idea.hasInternationalCoverage,
        score: Math.min(100, Math.max(0, idea.pioneerScore)),
        userId,
      })),
    })

    console.log(`[generateIdeasNow] user=${userId} rss=${usage.candidatesFromRss} qualified=${usage.qualifiedAfterTriage} supporting=${usage.supportingFound} ideas=${created.count} searches=${usage.searchesUsed} fetches=${usage.fetchesUsed}`)

    revalidatePath("/conteudo")
    revalidatePath("/conteudo/radar")
    return {
      success: true,
      data: {
        count: created.count,
        candidatesFromRss: usage.candidatesFromRss,
        qualifiedAfterTriage: usage.qualifiedAfterTriage,
        supportingFound: usage.supportingFound,
        evidencesCaptured: usage.evidencesCaptured,
      },
    }
  } catch (err) {
    console.error("[generateIdeasNow]", err)
    const msg = err instanceof Error ? err.message : "Erro ao gerar ideias"
    return { success: false, error: msg }
  }
}
