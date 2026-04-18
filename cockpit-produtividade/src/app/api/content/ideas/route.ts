import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import { trackUsage } from "@/services/ai.service"

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface RawItem { title: string; url?: string; date?: string; source: string }

// ── 1. Google News RSS ──────────────────────────────────────────────────

async function fetchGoogleNews(term: string): Promise<RawItem[]> {
  try {
    const items: RawItem[] = []
    for (const hl of ["pt-BR", "en"]) {
      const ceid = hl === "pt-BR" ? "BR:pt-419" : "US:en"
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=${hl}&gl=${hl === "pt-BR" ? "BR" : "US"}&ceid=${ceid}`
      const res = await fetch(url)
      if (!res.ok) continue
      const xml = await res.text()
      const re = /<item>([\s\S]*?)<\/item>/g
      let m
      while ((m = re.exec(xml)) !== null && items.length < 12) {
        const t = m[1].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || m[1].match(/<title>(.*?)<\/title>/)
        const d = m[1].match(/<pubDate>(.*?)<\/pubDate>/)
        if (t) items.push({ title: t[1].replace(/<[^>]*>/g, "").trim(), date: d?.[1], source: "Google News" })
      }
    }
    return items
  } catch { return [] }
}

// ── 2. YouTube Search ───────────────────────────────────────────────────

async function fetchYouTube(term: string): Promise<RawItem[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}&sp=CAISBAgBEAE%253D`
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" } })
    if (!res.ok) return []
    const html = await res.text()
    const items: RawItem[] = []
    const re = /"title":\{"runs":\[\{"text":"(.*?)"\}/g
    let m
    while ((m = re.exec(html)) !== null && items.length < 8) {
      const decoded = m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"')
      if (decoded.length > 10 && decoded.length < 150) items.push({ title: decoded, source: "YouTube" })
    }
    return items
  } catch { return [] }
}

// ── 3. Reddit ───────────────────────────────────────────────────────────

async function fetchReddit(term: string): Promise<RawItem[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=hot&t=day&limit=8`
    const res = await fetch(url, { headers: { "User-Agent": "IdeaAgent/1.0" } })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.data?.children ?? [])
      .filter((c: any) => c.data?.title && c.data?.score > 30)
      .slice(0, 8)
      .map((c: any) => ({ title: c.data.title, url: `https://reddit.com${c.data.permalink}`, source: `Reddit r/${c.data.subreddit}` }))
  } catch { return [] }
}

// ── 4. Google Trends Brasil ─────────────────────────────────────────────

async function fetchGoogleTrends(): Promise<RawItem[]> {
  try {
    const res = await fetch("https://trends.google.com.br/trending/rss?geo=BR")
    if (!res.ok) return []
    const xml = await res.text()
    const items: RawItem[] = []
    const re = /<item>([\s\S]*?)<\/item>/g
    let m
    while ((m = re.exec(xml)) !== null && items.length < 12) {
      const t = m[1].match(/<title>(.*?)<\/title>/)
      if (t) items.push({ title: t[1].replace(/<[^>]*>/g, "").trim(), source: "Google Trends Brasil" })
    }
    return items
  } catch { return [] }
}

// ── 5. Hacker News ──────────────────────────────────────────────────────

async function fetchHackerNews(): Promise<RawItem[]> {
  try {
    const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
    if (!idsRes.ok) return []
    const ids: number[] = await idsRes.json()
    const items: RawItem[] = []
    await Promise.all(ids.slice(0, 15).map(async (id) => {
      try {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        if (!r.ok) return
        const item = await r.json()
        if (item?.title && item?.score > 80) items.push({ title: item.title, url: item.url, source: "Hacker News" })
      } catch {}
    }))
    return items.slice(0, 8)
  } catch { return [] }
}

// ── Main handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const terms = await db.monitorTerm.findMany({ where: { userId, isActive: true } })
  if (terms.length === 0) return NextResponse.json({ error: "Adicione termos de monitoramento primeiro" }, { status: 400 })

  const userSources = await db.skillSource.findMany({ where: { userId, skillId: "RESEARCH" }, take: 20 })

  try {
    // Fetch ALL sources in parallel
    const [googleTrends, hackerNews] = await Promise.all([fetchGoogleTrends(), fetchHackerNews()])

    const perTerm: Record<string, { news: RawItem[]; yt: RawItem[]; reddit: RawItem[] }> = {}
    await Promise.all(terms.map(async (t) => {
      const [news, yt, reddit] = await Promise.all([fetchGoogleNews(t.term), fetchYouTube(t.term), fetchReddit(t.term)])
      perTerm[t.term] = { news, yt, reddit }
    }))

    // Build context
    let ctx = "DADOS COLETADOS EM TEMPO REAL:\n"
    if (googleTrends.length > 0) { ctx += "\n=== GOOGLE TRENDS BRASIL ===\n"; googleTrends.forEach((t, i) => { ctx += `${i + 1}. ${t.title}\n` }) }
    if (hackerNews.length > 0) { ctx += "\n=== HACKER NEWS ===\n"; hackerNews.forEach((t, i) => { ctx += `${i + 1}. ${t.title}\n` }) }
    for (const t of terms) {
      const d = perTerm[t.term]
      ctx += `\n=== TERMO: "${t.term}" ===\n`
      if (d.news.length > 0) { ctx += "GOOGLE NEWS:\n"; d.news.forEach((n, i) => { ctx += `${i + 1}. ${n.title}${n.date ? ` [${n.date}]` : ""}\n` }) }
      if (d.yt.length > 0) { ctx += "YOUTUBE:\n"; d.yt.forEach((v, i) => { ctx += `${i + 1}. ${v.title}\n` }) }
      if (d.reddit.length > 0) { ctx += "REDDIT:\n"; d.reddit.forEach((r, i) => { ctx += `${i + 1}. ${r.title} [${r.source}]\n` }) }
    }
    if (userSources.length > 0) { ctx += "\n=== FONTES DO USUÁRIO ===\n"; userSources.forEach((s) => { ctx += `- ${s.title}${s.url ? ` (${s.url})` : ""}\n` }) }

    const ideasPerTerm = Math.max(4, Math.floor(10 / terms.length))

    const prompt = `Você é um curador de conteúdo digital. Analise os dados REAIS abaixo e identifique oportunidades de conteúdo.

${ctx}

Gere ${ideasPerTerm} ideias para CADA termo. Baseie-se EXCLUSIVAMENTE nos dados acima.
Cruze fontes: tema em 3+ fontes = score alto. Priorize últimas 24-48h.

O campo "term" DEVE ser EXATAMENTE um destes: ${terms.map((t) => `"${t.term}"`).join(", ")}

Score: 97-100 viral agora, 94-96 boa janela, 90-93 relevante.

IMPORTANTE: No campo "source", inclua os NOMES das fontes reais E as manchetes originais que originaram a ideia.
No campo "relevance", inclua links/referências de onde a editora pode ir buscar imagens e screenshots (sites PT-BR de preferência).

Retorne APENAS JSON array:
[{"title":"...","summary":"...","angle":"...","hook":"...","term":"...","relevance":"notícia original + sites PT-BR onde buscar imagens (Tecmundo, InfoMoney, G1, Canaltech, etc)","source":"Google News: 'manchete original' + Reddit: r/subreddit","score":95}]`

    const start = Date.now()
    const message = await anthropic.messages.create({ model: "claude-sonnet-4-6", max_tokens: 4096, messages: [{ role: "user", content: prompt }] })
    trackUsage("generate_ideas", message.usage?.input_tokens ?? 0, message.usage?.output_tokens ?? 0, Date.now() - start, userId).catch(() => {})
    const text = message.content[0]
    if (text.type !== "text") return NextResponse.json({ error: "Erro IA" }, { status: 500 })

    const clean = text.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    let ideas: any[]
    try { ideas = JSON.parse(clean) } catch { const m = clean.match(/\[[\s\S]*\]/); if (m) ideas = JSON.parse(m[0]); else return NextResponse.json({ error: "Erro parse" }, { status: 500 }) }

    // Force-match ALL ideas to monitored terms
    const termNames = terms.map((t) => t.term)
    ideas = ideas.filter((i: any) => i.title && i.summary).map((i: any) => {
      // Try exact match first
      let matched = termNames.find((t) => t === i.term)
      if (!matched) {
        // Try fuzzy: check if any word from the term appears in the idea's term, title, or summary
        const ideaText = `${i.term || ""} ${i.title || ""} ${i.summary || ""}`.toLowerCase()
        matched = termNames.find((t) => {
          const words = t.toLowerCase().split(/\s+/)
          return words.some((w) => w.length >= 2 && ideaText.includes(w))
        })
      }
      if (!matched) {
        // Try reverse: check if any word from the idea term appears in a monitored term
        const ideaWords = (i.term || "").toLowerCase().split(/\s+/)
        matched = termNames.find((t) => {
          const tLower = t.toLowerCase()
          return ideaWords.some((w: string) => w.length >= 2 && tLower.includes(w))
        })
      }
      // Fallback: first monitored term
      if (!matched) matched = termNames[0]
      return { ...i, term: matched, score: Math.min(100, Math.max(90, i.score || 90)) }
    }).sort((a: any, b: any) => b.score - a.score)

    await db.ideaFeed.createMany({
      data: ideas.map((i: any) => ({
        title: i.title, summary: i.summary, angle: i.angle || null, hook: i.hook || null,
        term: i.term, relevance: `[${i.score}/100] ${i.relevance || ""}`, source: i.source || "Multi-source",
        score: i.score, userId,
      })),
    })

    const allIdeas = await db.ideaFeed.findMany({ where: { userId, isDiscarded: false }, orderBy: { createdAt: "desc" }, take: 100 })
    return NextResponse.json({ ok: true, created: ideas.length, ideas: allIdeas })
  } catch (err) {
    console.error("[ideas]", err)
    return NextResponse.json({ error: "Erro: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
