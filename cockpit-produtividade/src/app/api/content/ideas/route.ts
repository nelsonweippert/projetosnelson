import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Fetch real news from Google News RSS ────────────────────────────────

async function fetchNewsForTerm(term: string): Promise<{ title: string; link: string; date: string }[]> {
  try {
    const encoded = encodeURIComponent(term)
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const xml = await res.text()

    // Parse RSS XML (simple regex extraction)
    const items: { title: string; link: string; date: string }[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemXml = match[1]
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/)
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/)
      const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)
      if (titleMatch) {
        items.push({
          title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
          link: linkMatch?.[1] || "",
          date: dateMatch?.[1] || "",
        })
      }
    }
    return items
  } catch (err) {
    console.error(`[news] Failed to fetch for "${term}":`, err)
    return []
  }
}

// ── Fetch trending from YouTube ─────────────────────────────────────────

async function fetchYouTubeTrends(term: string): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(term)
    const url = `https://www.youtube.com/results?search_query=${encoded}&sp=CAISBAgBEAE%253D`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" },
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const html = await res.text()

    // Extract video titles from YouTube HTML
    const titles: string[] = []
    const titleRegex = /"title":\{"runs":\[\{"text":"(.*?)"\}/g
    let m
    while ((m = titleRegex.exec(html)) !== null && titles.length < 8) {
      const decoded = m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"')
      if (decoded.length > 10 && decoded.length < 150) titles.push(decoded)
    }
    return titles
  } catch {
    return []
  }
}

// ── Main handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const terms = await db.monitorTerm.findMany({ where: { userId, isActive: true } })
  if (terms.length === 0) return NextResponse.json({ error: "Adicione termos de monitoramento primeiro" }, { status: 400 })

  // Get user's custom research sources
  const userSources = await db.skillSource.findMany({
    where: { userId, skillId: "RESEARCH" }, orderBy: { createdAt: "desc" }, take: 20,
  })
  const customSourcesCtx = userSources.length > 0
    ? `\n\nFontes adicionais do usuário:\n${userSources.map((s) => `- ${s.title}${s.url ? ` (${s.url})` : ""}${s.content ? `: ${s.content}` : ""}`).join("\n")}`
    : ""

  try {
    // Step 1: Fetch REAL news for each term in parallel
    const newsPerTerm: Record<string, { news: { title: string; link: string; date: string }[]; ytTrends: string[] }> = {}

    await Promise.all(terms.map(async (t) => {
      const [news, ytTrends] = await Promise.all([
        fetchNewsForTerm(t.term),
        fetchYouTubeTrends(t.term),
      ])
      newsPerTerm[t.term] = { news, ytTrends }
    }))

    // Step 2: Build context with REAL data
    let newsContext = ""
    for (const t of terms) {
      const data = newsPerTerm[t.term]
      newsContext += `\n\n=== TERMO: "${t.term}" ===\n`
      if (data.news.length > 0) {
        newsContext += `NOTÍCIAS REAIS DE HOJE (Google News):\n`
        data.news.forEach((n, i) => { newsContext += `${i + 1}. ${n.title} (${n.date})\n` })
      }
      if (data.ytTrends.length > 0) {
        newsContext += `\nVÍDEOS EM ALTA NO YOUTUBE:\n`
        data.ytTrends.forEach((t, i) => { newsContext += `${i + 1}. ${t}\n` })
      }
    }

    // Step 3: Ask Claude to generate ideas based on REAL data
    const ideasPerTerm = Math.max(3, Math.floor(10 / terms.length))
    const searchPrompt = `Você é um curador de conteúdo digital que analisa notícias e tendências REAIS para identificar oportunidades de conteúdo.

Abaixo estão NOTÍCIAS REAIS e VÍDEOS EM ALTA coletados AGORA de Google News e YouTube:
${newsContext}
${customSourcesCtx}

Com base EXCLUSIVAMENTE nestas notícias e tendências REAIS acima, gere ${ideasPerTerm} ideias de conteúdo para CADA termo monitorado.

REGRAS:
1. Cada ideia DEVE ser baseada em uma notícia ou tendência REAL listada acima
2. O campo "term" DEVE ser EXATAMENTE um destes valores: ${terms.map((t) => `"${t.term}"`).join(", ")}
3. Distribua igualmente entre os termos
4. Priorize notícias das últimas 24-48h
5. Score 90-100 baseado em: quão recente é, potencial viral, e lacuna de conteúdo

Retorne APENAS um JSON array (sem markdown, sem code blocks):
[{
  "title": "título atrativo para o conteúdo baseado na notícia real",
  "summary": "resumo de 2-3 frases conectando a notícia à oportunidade de conteúdo",
  "angle": "ângulo único para diferenciar seu conteúdo",
  "hook": "sugestão de hook para os primeiros 3 segundos",
  "term": "EXATAMENTE um dos termos listados",
  "relevance": "notícia real que originou esta ideia + por que é relevante AGORA",
  "source": "Google News / YouTube Trending",
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

    // Parse JSON
    const cleanJson = responseText.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    let ideas: any[]
    try {
      ideas = JSON.parse(cleanJson)
    } catch {
      const match = cleanJson.match(/\[[\s\S]*\]/)
      if (match) ideas = JSON.parse(match[0])
      else {
        console.error("[ideas] Failed to parse:", cleanJson.substring(0, 500))
        return NextResponse.json({ error: "Erro ao processar resposta da IA" }, { status: 500 })
      }
    }

    // Validate terms
    const termNames = terms.map((t) => t.term)
    ideas = ideas
      .filter((i: any) => i.title && i.summary)
      .map((i: any) => {
        let matchedTerm = termNames.find((t) => t === i.term)
        if (!matchedTerm) {
          matchedTerm = termNames.find((t) => {
            const words = t.toLowerCase().split(/\s+/)
            const ideaText = `${i.term || ""} ${i.title || ""}`.toLowerCase()
            return words.some((w) => w.length >= 2 && ideaText.includes(w))
          }) || termNames[0]
        }
        return { ...i, term: matchedTerm, score: Math.min(100, Math.max(90, i.score || 90)) }
      })
      .sort((a: any, b: any) => b.score - a.score)

    // Save
    const created = await db.ideaFeed.createMany({
      data: ideas.map((idea: any) => ({
        title: idea.title,
        summary: idea.summary,
        angle: idea.angle || null,
        hook: idea.hook || null,
        term: idea.term,
        relevance: `[${idea.score}/100] ${idea.relevance || ""}`.trim(),
        source: idea.source || "Google News + YouTube",
        score: idea.score,
        userId,
      })),
    })

    // Return all ideas
    const allIdeas = await db.ideaFeed.findMany({
      where: { userId, isDiscarded: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({
      ok: true,
      created: created.count,
      ideas: allIdeas,
      debug: { newsFound: Object.fromEntries(terms.map((t) => [t.term, newsPerTerm[t.term]?.news?.length ?? 0])) },
    })
  } catch (err) {
    console.error("[ideas] Error:", err)
    return NextResponse.json({ error: "Erro ao gerar ideias: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
