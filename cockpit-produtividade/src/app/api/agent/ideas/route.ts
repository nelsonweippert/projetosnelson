import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, ideas } = await req.json()
  if (!userId || !ideas || !Array.isArray(ideas)) {
    return NextResponse.json({ error: "Missing userId or ideas" }, { status: 400 })
  }

  const created = await db.ideaFeed.createMany({
    data: ideas.map((idea: any) => ({
      title: idea.title,
      summary: idea.summary,
      angle: idea.angle || null,
      hook: idea.hook || null,
      term: idea.term,
      relevance: idea.relevance || null,
      source: idea.source || "agent",
      sourceUrl: idea.sourceUrl || null,
      publishedAt: idea.publishedAt ? new Date(idea.publishedAt) : null,
      language: idea.language || "pt-BR",
      pioneerScore: typeof idea.pioneerScore === "number" ? idea.pioneerScore : null,
      score: Math.min(100, Math.max(0, idea.score ?? idea.pioneerScore ?? 90)),
      userId,
    })),
  })

  return NextResponse.json({ ok: true, created: created.count })
}

// Get terms and research sources for the agent
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  const [terms, sources] = await Promise.all([
    db.monitorTerm.findMany({ where: { userId, isActive: true } }),
    db.skillSource.findMany({ where: { userId, skillId: "RESEARCH" }, take: 30 }),
  ])

  return NextResponse.json({ terms, sources })
}
