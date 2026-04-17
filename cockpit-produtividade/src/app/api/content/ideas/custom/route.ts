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
  const { description } = await req.json()
  if (!description) return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 })

  // Get terms for matching
  const terms = await db.monitorTerm.findMany({ where: { userId, isActive: true } })
  const termNames = terms.map((t) => t.term)
  const defaultTerm = termNames[0] || description.split(" ").slice(0, 3).join(" ")

  try {
    const prompt = `Você é um analista de conteúdo digital. O criador tem uma ideia específica e quer saber se vale a pena produzir.

IDEIA DO CRIADOR:
"${description}"

Analise PROFUNDAMENTE esta ideia e retorne EXATAMENTE 3 variações de conteúdo baseadas nela.

Para cada variação:
1. Um ângulo DIFERENTE de abordar o mesmo tema
2. Avalie o potencial real de viralização (score 90-100)
3. Explique POR QUE tem ou não potencial

O score deve ser REALISTA:
- 97-100: tema viral AGORA, timing perfeito, alta demanda + pouca oferta
- 94-96: tema relevante com boa janela, público engajado
- 90-93: tema interessante mas já saturado ou timing não ideal

${termNames.length > 0 ? `Associe cada ideia a um destes termos: ${termNames.map((t) => `"${t}"`).join(", ")}. Se nenhum encaixar, use "${defaultTerm}".` : `Use "${defaultTerm}" como termo.`}

Retorne APENAS JSON array (sem markdown):
[{
  "title": "título otimizado para clique",
  "summary": "análise de 2-3 frases: por que funciona (ou não), contexto atual, oportunidade",
  "angle": "o que diferencia ESTA variação das outras",
  "hook": "sugestão de hook para os primeiros 3 segundos",
  "term": "termo associado",
  "relevance": "análise de viralização: timing + demanda + competição + público-alvo",
  "source": "Ideia personalizada",
  "score": 95
}]`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0]
    if (text.type !== "text") return NextResponse.json({ error: "Erro IA" }, { status: 500 })

    const clean = text.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    let ideas: any[]
    try { ideas = JSON.parse(clean) } catch { const m = clean.match(/\[[\s\S]*\]/); if (m) ideas = JSON.parse(m[0]); else return NextResponse.json({ error: "Erro parse" }, { status: 500 }) }

    ideas = ideas.filter((i: any) => i.title && i.summary).map((i: any) => {
      let matched = termNames.find((t) => t === i.term)
      if (!matched) matched = termNames.find((t) => t.toLowerCase().split(/\s+/).some((w) => w.length >= 2 && (i.title || "").toLowerCase().includes(w))) || defaultTerm
      return { ...i, term: matched, score: Math.min(100, Math.max(90, i.score || 90)) }
    })

    await db.ideaFeed.createMany({
      data: ideas.map((i: any) => ({
        title: i.title, summary: i.summary, angle: i.angle || null, hook: i.hook || null,
        term: i.term, relevance: `[${i.score}/100] ${i.relevance || ""}`, source: "Ideia personalizada",
        score: i.score, userId,
      })),
    })

    const allIdeas = await db.ideaFeed.findMany({ where: { userId, isDiscarded: false }, orderBy: { createdAt: "desc" }, take: 100 })
    return NextResponse.json({ ok: true, created: ideas.length, ideas: allIdeas })
  } catch (err) {
    console.error("[custom-idea]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
