import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const terms = await db.monitorTerm.findMany({ where: { userId, isActive: true } })
  if (terms.length === 0) return NextResponse.json({ error: "Adicione termos de monitoramento primeiro" }, { status: 400 })

  const allTerms = terms.map((t) => t.term).join(", ")

  try {
    // Step 1: Search for trending topics using Claude with web search context
    const searchPrompt = `Pesquise na internet as notícias, tendências e assuntos mais quentes de HOJE sobre estes temas: ${allTerms}

Para cada tema, busque:
- Notícias recentes (últimas 24-72h)
- Vídeos virais ou em alta
- Discussões populares em redes sociais
- Dados e estatísticas recentes
- Lançamentos, atualizações ou eventos relevantes

Depois, gere EXATAMENTE 10 ideias de conteúdo baseadas no que encontrou.
Cada ideia deve ter potencial viral e ser baseada em algo REAL e ATUAL.

Dê uma nota de POTENCIAL (90-100) para cada ideia baseado em:
- Timing (quão quente é o assunto agora)
- Volume de busca estimado
- Potencial de engajamento
- Lacuna de conteúdo (poucos criadores cobriram)

Retorne APENAS um JSON array válido (sem markdown, sem code blocks, sem texto antes ou depois):
[{
  "title": "título claro e atrativo para o conteúdo",
  "summary": "resumo de 2-3 frases explicando o que é e por que é relevante AGORA",
  "angle": "ângulo único que diferencia este conteúdo dos demais",
  "hook": "sugestão de hook para os primeiros 3 segundos",
  "term": "termo monitorado principal",
  "relevance": "dado concreto ou contexto que prova que é tendência (ex: +500% de buscas, viral no Twitter, etc)",
  "source": "fonte da informação (ex: Google Trends, Twitter, YouTube trending)",
  "score": 95
}]`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: searchPrompt }],
    })

    const responseText = message.content[0]
    if (responseText.type !== "text") {
      return NextResponse.json({ error: "Resposta inesperada da IA" }, { status: 500 })
    }

    // Parse JSON from response
    const cleanJson = responseText.text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim()

    let ideas: any[]
    try {
      ideas = JSON.parse(cleanJson)
    } catch {
      // Try to extract JSON array from the response
      const match = cleanJson.match(/\[[\s\S]*\]/)
      if (match) {
        ideas = JSON.parse(match[0])
      } else {
        console.error("[ideas] Failed to parse:", cleanJson.substring(0, 500))
        return NextResponse.json({ error: "Erro ao processar resposta da IA" }, { status: 500 })
      }
    }

    // Validate and sort by score
    ideas = ideas
      .filter((i: any) => i.title && i.summary)
      .map((i: any) => ({ ...i, score: Math.min(100, Math.max(90, i.score || 90)) }))
      .sort((a: any, b: any) => b.score - a.score)

    // Save to database
    const created = await db.ideaFeed.createMany({
      data: ideas.map((idea: any) => ({
        title: idea.title,
        summary: idea.summary,
        angle: idea.angle || null,
        hook: idea.hook || null,
        term: idea.term || allTerms,
        relevance: `[${idea.score}/100] ${idea.relevance || ""} ${idea.source ? `(Fonte: ${idea.source})` : ""}`.trim(),
        source: idea.source || "ai_research",
        userId,
      })),
    })

    // Fetch all ideas to return
    const allIdeas = await db.ideaFeed.findMany({
      where: { userId, isDiscarded: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ ok: true, created: created.count, ideas: allIdeas })
  } catch (err) {
    console.error("[ideas] Error:", err)
    return NextResponse.json({ error: "Erro ao gerar ideias: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
