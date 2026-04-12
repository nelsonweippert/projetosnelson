#!/usr/bin/env npx tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDEA AGENT — Agente local de pesquisa de tendências
 *
 * Roda diariamente via crontab. Busca em múltiplas fontes, cruza dados,
 * gera ideias via Claude e salva no cockpit via API.
 *
 * Fontes:
 * 1. Google News RSS (manchetes reais em tempo real)
 * 2. YouTube Search (vídeos em alta por tema)
 * 3. Reddit (discussões populares por tema)
 * 4. Google Trends RSS (tendências de busca)
 * 5. Hacker News (tech trends)
 * 6. Fontes customizadas do usuário (skill RESEARCH)
 *
 * Uso: npx tsx scripts/idea-agent.ts
 * Cron: 0 8 * * * cd /path/to/project && npx tsx scripts/idea-agent.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk"
import { config } from "dotenv"

config({ path: ".env.local" })
config()

const COCKPIT_URL = process.env.COCKPIT_URL || "http://localhost:3010"
const AGENT_SECRET = process.env.AGENT_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const USER_ID = process.env.AGENT_USER_ID

if (!AGENT_SECRET || !ANTHROPIC_API_KEY || !USER_ID) {
  console.error("❌ Missing env vars: AGENT_SECRET, ANTHROPIC_API_KEY, AGENT_USER_ID")
  process.exit(1)
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ═══════════════════════════════════════════════════════════════════════════
// SOURCES — Cada fonte retorna artigos/tendências reais
// ═══════════════════════════════════════════════════════════════════════════

interface RawItem {
  title: string
  url?: string
  date?: string
  source: string
}

// ── 1. Google News RSS ──────────────────────────────────────────────────

async function fetchGoogleNews(term: string): Promise<RawItem[]> {
  try {
    const encoded = encodeURIComponent(term)
    // Busca em português e inglês para cobertura máxima
    const urls = [
      `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
      `https://news.google.com/rss/search?q=${encoded}&hl=en&gl=US&ceid=US:en`,
    ]

    const allItems: RawItem[] = []

    for (const url of urls) {
      const res = await fetch(url)
      if (!res.ok) continue
      const xml = await res.text()
      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      let match
      while ((match = itemRegex.exec(xml)) !== null && allItems.length < 15) {
        const itemXml = match[1]
        const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/)
        const linkMatch = itemXml.match(/<link>(.*?)<\/link>/)
        const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)
        if (titleMatch) {
          allItems.push({
            title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
            url: linkMatch?.[1],
            date: dateMatch?.[1],
            source: "Google News",
          })
        }
      }
    }
    return allItems
  } catch (err) {
    console.warn(`⚠️  Google News falhou para "${term}":`, (err as Error).message)
    return []
  }
}

// ── 2. YouTube Search ───────────────────────────────────────────────────

async function fetchYouTube(term: string): Promise<RawItem[]> {
  try {
    const encoded = encodeURIComponent(term)
    // sp=CAISBAgBEAE = filtro "Upload date: today" + "Sort by: relevance"
    const url = `https://www.youtube.com/results?search_query=${encoded}&sp=CAISBAgBEAE%253D`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
    })
    if (!res.ok) return []
    const html = await res.text()

    const items: RawItem[] = []
    const titleRegex = /"title":\{"runs":\[\{"text":"(.*?)"\}/g
    let m
    while ((m = titleRegex.exec(html)) !== null && items.length < 10) {
      const decoded = m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"').replace(/\\n/g, " ")
      if (decoded.length > 10 && decoded.length < 150) {
        items.push({ title: decoded, source: "YouTube Trending" })
      }
    }
    return items
  } catch (err) {
    console.warn(`⚠️  YouTube falhou para "${term}":`, (err as Error).message)
    return []
  }
}

// ── 3. Reddit ───────────────────────────────────────────────────────────

async function fetchReddit(term: string): Promise<RawItem[]> {
  try {
    const encoded = encodeURIComponent(term)
    const url = `https://www.reddit.com/search.json?q=${encoded}&sort=hot&t=day&limit=10`
    const res = await fetch(url, {
      headers: { "User-Agent": "IdeaAgent/1.0" },
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data?.data?.children ?? [])
      .filter((c: any) => c.data?.title && c.data?.score > 50)
      .slice(0, 10)
      .map((c: any) => ({
        title: c.data.title,
        url: `https://reddit.com${c.data.permalink}`,
        source: `Reddit r/${c.data.subreddit}`,
      }))
  } catch (err) {
    console.warn(`⚠️  Reddit falhou para "${term}":`, (err as Error).message)
    return []
  }
}

// ── 4. Google Trends RSS ────────────────────────────────────────────────

async function fetchGoogleTrends(): Promise<RawItem[]> {
  try {
    const url = "https://trends.google.com.br/trending/rss?geo=BR"
    const res = await fetch(url)
    if (!res.ok) return []
    const xml = await res.text()

    const items: RawItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
      const itemXml = match[1]
      const titleMatch = itemXml.match(/<title>(.*?)<\/title>/)
      if (titleMatch) {
        items.push({
          title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
          source: "Google Trends Brasil",
        })
      }
    }
    return items
  } catch (err) {
    console.warn("⚠️  Google Trends falhou:", (err as Error).message)
    return []
  }
}

// ── 5. Hacker News (top stories) ────────────────────────────────────────

async function fetchHackerNews(): Promise<RawItem[]> {
  try {
    const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
    if (!idsRes.ok) return []
    const ids: number[] = await idsRes.json()

    const items: RawItem[] = []
    const top20 = ids.slice(0, 20)

    await Promise.all(top20.map(async (id) => {
      try {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        if (!res.ok) return
        const item = await res.json()
        if (item?.title && item?.score > 100) {
          items.push({
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${id}`,
            source: "Hacker News",
          })
        }
      } catch {}
    }))

    return items.sort((a, b) => (b as any).score - (a as any).score).slice(0, 10)
  } catch (err) {
    console.warn("⚠️  Hacker News falhou:", (err as Error).message)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN AGENT FLOW
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🔍 Idea Agent iniciando...")
  console.log(`   Cockpit: ${COCKPIT_URL}`)
  console.log(`   User: ${USER_ID}`)
  console.log(`   Data: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`)
  console.log("")

  // Step 1: Get terms and sources from cockpit
  console.log("📋 Buscando termos monitorados...")
  const configRes = await fetch(`${COCKPIT_URL}/api/agent/ideas?userId=${USER_ID}`, {
    headers: { Authorization: `Bearer ${AGENT_SECRET}` },
  })
  if (!configRes.ok) {
    console.error("❌ Falha ao buscar config:", await configRes.text())
    process.exit(1)
  }
  const { terms, sources } = await configRes.json()

  if (!terms || terms.length === 0) {
    console.log("⚠️  Nenhum termo monitorado. Adicione termos no cockpit.")
    process.exit(0)
  }

  const termNames: string[] = terms.map((t: any) => t.term)
  console.log(`   Termos: ${termNames.join(", ")}`)
  console.log(`   Fontes customizadas: ${sources.length}`)
  console.log("")

  // Step 2: Fetch from ALL sources in parallel
  console.log("🌐 Buscando em todas as fontes...")

  const [googleTrends, hackerNews] = await Promise.all([
    fetchGoogleTrends(),
    fetchHackerNews(),
  ])
  console.log(`   Google Trends Brasil: ${googleTrends.length} trends`)
  console.log(`   Hacker News: ${hackerNews.length} stories`)

  const perTerm: Record<string, { news: RawItem[]; youtube: RawItem[]; reddit: RawItem[] }> = {}

  await Promise.all(termNames.map(async (term) => {
    const [news, youtube, reddit] = await Promise.all([
      fetchGoogleNews(term),
      fetchYouTube(term),
      fetchReddit(term),
    ])
    perTerm[term] = { news, youtube, reddit }
    console.log(`   "${term}": ${news.length} news, ${youtube.length} YT, ${reddit.length} Reddit`)
  }))

  console.log("")

  // Step 3: Build rich context
  let context = "DADOS COLETADOS EM TEMPO REAL:\n"

  // Global trends
  if (googleTrends.length > 0) {
    context += "\n=== GOOGLE TRENDS BRASIL (trending agora) ===\n"
    googleTrends.forEach((t, i) => { context += `${i + 1}. ${t.title}\n` })
  }
  if (hackerNews.length > 0) {
    context += "\n=== HACKER NEWS (top stories tech) ===\n"
    hackerNews.forEach((t, i) => { context += `${i + 1}. ${t.title}${t.url ? ` (${t.url})` : ""}\n` })
  }

  // Per-term data
  for (const term of termNames) {
    const data = perTerm[term]
    context += `\n=== TERMO: "${term}" ===\n`

    if (data.news.length > 0) {
      context += "GOOGLE NEWS (notícias reais de hoje):\n"
      data.news.forEach((n, i) => { context += `${i + 1}. ${n.title}${n.date ? ` [${n.date}]` : ""}\n` })
    }
    if (data.youtube.length > 0) {
      context += "\nYOUTUBE (vídeos recentes em alta):\n"
      data.youtube.forEach((v, i) => { context += `${i + 1}. ${v.title}\n` })
    }
    if (data.reddit.length > 0) {
      context += "\nREDDIT (discussões populares hoje):\n"
      data.reddit.forEach((r, i) => { context += `${i + 1}. ${r.title} [${r.source}]\n` })
    }
  }

  // Custom sources
  if (sources.length > 0) {
    context += "\n=== FONTES CUSTOMIZADAS DO USUÁRIO ===\n"
    sources.forEach((s: any) => {
      context += `- ${s.title}${s.url ? ` (${s.url})` : ""}${s.content ? `: ${s.content}` : ""}\n`
    })
  }

  const totalItems = googleTrends.length + hackerNews.length +
    Object.values(perTerm).reduce((s, d) => s + d.news.length + d.youtube.length + d.reddit.length, 0)

  console.log(`📊 Total de itens coletados: ${totalItems}`)
  console.log("")

  // Step 4: Generate ideas with Claude
  console.log("🤖 Gerando ideias com Claude...")

  const ideasPerTerm = Math.max(5, Math.floor(15 / termNames.length))

  const prompt = `Você é um curador de conteúdo digital profissional. Sua missão é identificar as MELHORES oportunidades de conteúdo baseado em dados REAIS coletados agora de múltiplas fontes.

${context}

ANÁLISE E GERAÇÃO:
1. Cruze as informações entre fontes — se um tema aparece em Google News + Reddit + YouTube, tem potencial viral ALTO
2. Identifique lacunas — temas discutidos em notícias mas com poucos vídeos no YouTube = oportunidade
3. Priorize recência — notícias das últimas 24h > 48h > 72h
4. Considere o ângulo brasileiro — adapte tendências globais ao contexto BR quando relevante

Gere ${ideasPerTerm} ideias para CADA um destes termos: ${termNames.map((t) => `"${t}"`).join(", ")}

REGRAS OBRIGATÓRIAS:
- O campo "term" DEVE ser EXATAMENTE um destes: ${termNames.map((t) => `"${t}"`).join(", ")}
- Cada ideia DEVE referenciar pelo menos uma notícia/tendência REAL dos dados acima
- Score 90-93: tema relevante mas não urgente
- Score 94-96: tema quente com boa janela de oportunidade
- Score 97-100: tema viral AGORA, precisa produzir em 24-48h

Retorne APENAS JSON array (sem markdown, sem code blocks, sem texto extra):
[{
  "title": "título atrativo e específico para o conteúdo",
  "summary": "2-3 frases: o que aconteceu, por que importa, e como virar conteúdo",
  "angle": "ângulo diferenciador (o que ninguém está abordando)",
  "hook": "hook para os primeiros 3 segundos que para o scroll",
  "term": "EXATAMENTE um dos termos listados",
  "relevance": "notícia/dado real que originou esta ideia + quantas fontes confirmam",
  "source": "fontes onde apareceu (ex: Google News + Reddit + YouTube)",
  "score": 95
}]`

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const responseText = message.content[0]
  if (responseText.type !== "text") {
    console.error("❌ Resposta inesperada da IA")
    process.exit(1)
  }

  // Parse
  const cleanJson = responseText.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
  let ideas: any[]
  try {
    ideas = JSON.parse(cleanJson)
  } catch {
    const match = cleanJson.match(/\[[\s\S]*\]/)
    if (match) ideas = JSON.parse(match[0])
    else { console.error("❌ Parse failed:", cleanJson.substring(0, 300)); process.exit(1) }
  }

  // Validate terms
  ideas = ideas
    .filter((i: any) => i.title && i.summary)
    .map((i: any) => {
      let matched = termNames.find((t) => t === i.term)
      if (!matched) {
        matched = termNames.find((t) => {
          const words = t.toLowerCase().split(/\s+/)
          return words.some((w) => w.length >= 2 && (i.term || i.title || "").toLowerCase().includes(w))
        }) || termNames[0]
      }
      return {
        ...i,
        term: matched,
        score: Math.min(100, Math.max(90, i.score || 90)),
        relevance: `[${i.score || 90}/100] ${i.relevance || ""}`,
      }
    })
    .sort((a: any, b: any) => b.score - a.score)

  console.log(`✅ ${ideas.length} ideias geradas`)
  ideas.forEach((i: any) => {
    console.log(`   [${i.score}] ${i.term}: ${i.title.substring(0, 60)}...`)
  })
  console.log("")

  // Step 5: Save to cockpit
  console.log("💾 Salvando no cockpit...")
  const saveRes = await fetch(`${COCKPIT_URL}/api/agent/ideas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AGENT_SECRET}`,
    },
    body: JSON.stringify({ userId: USER_ID, ideas }),
  })

  if (!saveRes.ok) {
    console.error("❌ Falha ao salvar:", await saveRes.text())
    process.exit(1)
  }

  const result = await saveRes.json()
  console.log(`✅ ${result.created} ideias salvas no cockpit!`)
  console.log("")
  console.log("🎉 Agente finalizado com sucesso!")
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err)
  process.exit(1)
})
