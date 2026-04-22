// Source Discovery — usa Claude com web_search pra descobrir as melhores
// fontes de informação pra um tema específico. Retorna estrutura curada que
// o usuário revisa antes de usar no pipeline de geração de ideias.

import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Modelo: Sonnet aqui compensa — precisa raciocínio sobre qualidade editorial
// e conhecimento amplo de publishers. Roda 1x por tema então custo é baixo.
const MODEL = "claude-sonnet-4-6"

export const TermSourceSchema = z.object({
  host: z.string().describe("Domínio raiz sem www, ex: folha.uol.com.br, techcrunch.com"),
  name: z.string().describe("Nome editorial, ex: Folha de S.Paulo, TechCrunch"),
  tier: z.enum(["TIER_1", "TIER_2", "BLOG"]).describe("TIER_1: veículos grandes estabelecidos. TIER_2: especializados reconhecidos. BLOG: newsletters/blogs de autoridade no nicho."),
  language: z.enum(["pt-BR", "en", "es"]),
  note: z.string().describe("Por que essa fonte é relevante pro tema. 1 frase curta."),
})
export type TermSource = z.infer<typeof TermSourceSchema> & { isActive: boolean }

const ResponseSchema = z.object({
  sources: z.array(TermSourceSchema).min(5).max(20),
})

function buildSystemPrompt(): string {
  return `Você é CURADOR EDITORIAL. Recebe um tema de monitoramento e retorna as melhores fontes de informação sobre aquele tema.

REGRAS
- 10-15 fontes idealmente. Mínimo 5, máximo 20.
- Mix: ~60% em PT-BR (se o tema interessa público brasileiro), ~40% em inglês internacional. Ajuste conforme a natureza do tema.
- Priorize QUALIDADE sobre quantidade: veículos com equipe editorial real, jornalismo de apuração, análise de profundidade.
- Inclua sempre: publishers estabelecidos (TIER_1), especializados no nicho (TIER_2), e 2-4 blogs/newsletters de autoridade (BLOG).
- EVITE:
  · agregadores (Google News, Bing News, reddit)
  · redes sociais (Twitter, LinkedIn, YouTube) — são canais, não fontes primárias
  · sites de opinião pura sem apuração
  · blogs que apenas replicam notícias de outros
- Use web_search pra VALIDAR que as fontes existem e estão ativas. Se não encontrar evidência recente (últimos 60 dias), não inclua.
- host: domínio raiz exato, sem "www.", sem caminho. Ex: "folha.uol.com.br", NÃO "https://folha.uol.com.br/"
- note: 1 frase objetiva explicando a força editorial da fonte pro tema específico.

FORMATO: JSON { sources: [...] } conforme schema.`
}

export async function discoverSourcesForTerm(opts: {
  term: string
  intent?: string | null
}): Promise<{ sources: TermSource[]; usage: { inputTokens: number; outputTokens: number; searchesUsed: number } }> {
  const { term, intent } = opts
  const userPrompt = `TEMA: "${term}"
${intent ? `INTENÇÃO/FOCO DECLARADO: ${intent}` : ""}

Pesquise e retorne as melhores fontes de informação sobre esse tema. Use web_search pra validar que as fontes estão ativas e cobrem o tema.`

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }]
  let searchesUsed = 0
  let finalText: string | null = null
  const totals = { input: 0, output: 0 }

  // Loop pause_turn (web_search pode exigir várias rodadas)
  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral" } }],
      output_config: { format: zodOutputFormat(ResponseSchema), effort: "medium" },
      tools: [{
        type: "web_search_20260209",
        name: "web_search",
        max_uses: 8,
      }],
      messages,
    })
    totals.input += response.usage.input_tokens
    totals.output += response.usage.output_tokens
    for (const b of response.content) {
      if (b.type === "server_tool_use" && b.name === "web_search") searchesUsed++
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content })
      continue
    }
    const tb = [...response.content].reverse().find((b): b is Anthropic.TextBlock => b.type === "text")
    if (!tb) throw new Error(`source-discovery: sem text (stop=${response.stop_reason})`)
    finalText = tb.text
    break
  }
  if (!finalText) throw new Error("source-discovery: pause_turn loop exceeded")

  let parsed: z.infer<typeof ResponseSchema>
  try { parsed = ResponseSchema.parse(JSON.parse(finalText)) }
  catch (err) {
    console.error("[source-discovery] parse:", err, "raw:", finalText.slice(0, 400))
    throw new Error("Falha ao parsear fontes sugeridas")
  }

  // Dedup por host + normaliza
  const seen = new Set<string>()
  const sources: TermSource[] = []
  for (const s of parsed.sources) {
    const host = s.host.toLowerCase().replace(/^www\./, "").replace(/\/+$/, "")
    if (!host || seen.has(host)) continue
    seen.add(host)
    sources.push({ ...s, host, isActive: true })
  }

  return {
    sources,
    usage: { inputTokens: totals.input, outputTokens: totals.output, searchesUsed },
  }
}
