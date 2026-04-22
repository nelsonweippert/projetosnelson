import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateIdeasWithResearch, safeDate } from "@/services/ai.service"

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const usersWithTerms = await db.monitorTerm.findMany({
    where: { isActive: true },
    select: { userId: true, term: true, intent: true },
  })

  const byUser: Record<string, { terms: string[]; intents: Record<string, string> }> = {}
  for (const { userId, term, intent } of usersWithTerms) {
    if (!byUser[userId]) byUser[userId] = { terms: [], intents: {} }
    byUser[userId].terms.push(term)
    if (intent && intent.trim()) byUser[userId].intents[term] = intent.trim()
  }

  let totalCreated = 0
  const perUserStats: Array<{ userId: string; terms: number; ideas: number; error?: string }> = []

  for (const [userId, { terms, intents }] of Object.entries(byUser)) {
    try {
      const { ideas, usage } = await generateIdeasWithResearch({
        terms,
        termIntents: intents,
        ideasPerTerm: 2,
        hoursWindow: 72,
        language: "both",
        userId,
      })

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
          publishedAt: safeDate(idea.publishedAt),
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

      totalCreated += created.count
      perUserStats.push({ userId, terms: terms.length, ideas: created.count })
      console.log(`[cron/ideas] user=${userId} rss=${usage.candidatesFromRss} qualified=${usage.qualifiedAfterTriage} supporting=${usage.supportingFound} ideas=${created.count} searches=${usage.searchesUsed} fetches=${usage.fetchesUsed} cacheRead=${usage.cacheReadTokens}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cron/ideas] user=${userId} error:`, msg)
      perUserStats.push({ userId, terms: terms.length, ideas: 0, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: Object.keys(byUser).length,
    ideasCreated: totalCreated,
    perUser: perUserStats,
  })
}
