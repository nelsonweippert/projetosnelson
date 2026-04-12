import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateContentSuggestion } from "@/services/ai.service"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all users with active monitor terms
  const usersWithTerms = await db.monitorTerm.findMany({
    where: { isActive: true },
    select: { userId: true, term: true },
  })

  // Group terms by user
  const byUser: Record<string, string[]> = {}
  for (const { userId, term } of usersWithTerms) {
    if (!byUser[userId]) byUser[userId] = []
    byUser[userId].push(term)
  }

  let totalCreated = 0

  for (const [userId, terms] of Object.entries(byUser)) {
    try {
      const allTerms = terms.join(", ")
      const prompt = `Você é um pesquisador de tendências de conteúdo digital.

Termos monitorados: ${allTerms}

Pesquise as tendências, notícias e assuntos mais quentes e relevantes HOJE sobre esses temas.
Gere 10 ideias de conteúdo baseadas em novidades REAIS e tendências ATUAIS.

Retorne APENAS um JSON array:
[{
  "title": "título da ideia",
  "summary": "resumo em 2-3 frases",
  "angle": "ângulo único para abordar",
  "hook": "sugestão de hook",
  "term": "termo principal relacionado",
  "relevance": "por que é tendência agora",
  "source": "fonte da informação",
  "score": 95
}]`

      const result = await generateContentSuggestion(
        "Retorne APENAS JSON válido, sem markdown.",
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
          source: idea.source || "cron",
          score: Math.min(100, Math.max(90, idea.score || 90)),
          userId,
        })),
      })

      totalCreated += created.count
    } catch (err) {
      console.error(`[cron/ideas] Error for user ${userId}:`, err)
    }
  }

  return NextResponse.json({ ok: true, usersProcessed: Object.keys(byUser).length, ideasCreated: totalCreated })
}
