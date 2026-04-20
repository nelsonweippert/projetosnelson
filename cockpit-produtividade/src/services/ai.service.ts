import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { db } from "@/lib/db"
import { getTaskStats } from "./task.service"
import { getFinanceSummary, getExpensesByCategory } from "./finance.service"
import { getReferenceStats } from "./reference.service"
import { getContentStats } from "./content.service"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Model registry + pricing (USD per token) ───────────────────────────
const MODELS = {
  "claude-opus-4-7":   { input: 5 / 1_000_000,  output: 25 / 1_000_000 },
  "claude-opus-4-6":   { input: 5 / 1_000_000,  output: 25 / 1_000_000 },
  "claude-sonnet-4-6": { input: 3 / 1_000_000,  output: 15 / 1_000_000 },
  "claude-haiku-4-5":  { input: 1 / 1_000_000,  output: 5 / 1_000_000 },
} as const
type ModelId = keyof typeof MODELS

// Default Sonnet 4.6 pro pipeline de ideias (mais barato, qualidade excelente pra síntese/extração).
// Override via env IDEAS_MODEL se quiser Opus 4.7.
const IDEAS_MODEL: ModelId = (process.env.IDEAS_MODEL as ModelId) || "claude-sonnet-4-6"
const REVIEW_MODEL: ModelId = "claude-sonnet-4-6"

export async function generateWeeklyReview(userId: string): Promise<string> {
  const [taskStats, finance, refStats, contentStats] = await Promise.all([
    getTaskStats(userId),
    getFinanceSummary(userId),
    getReferenceStats(userId),
    getContentStats(userId),
  ])

  const prompt = `Você é um assistente de produtividade pessoal. Analise os dados abaixo e gere uma revisão semanal em português, clara, direta e motivadora. Use markdown leve.

DADOS DA SEMANA:

Tarefas:
- Total: ${taskStats.total} | A fazer: ${taskStats.todo} | Em andamento: ${taskStats.inProgress} | Concluídas: ${taskStats.done}

Financeiro (mês atual):
- Receitas: R$ ${finance.totalIncome.toFixed(2)} | Despesas: R$ ${finance.totalExpense.toFixed(2)} | Saldo: R$ ${finance.balance.toFixed(2)} | Taxa de poupança: ${finance.savingsRate.toFixed(1)}%

Biblioteca de Estudos:
- Total: ${refStats.total} | Não lido: ${refStats.unread} | Lendo: ${refStats.reading} | Lido: ${refStats.read}

Conteúdo:
- Total: ${contentStats.total} | Ideias: ${contentStats.ideas} | Em produção: ${contentStats.inProduction} | Publicados: ${contentStats.published}

Gere:
1. Um resumo executivo em 2-3 linhas
2. Destaques positivos (o que foi bem)
3. Pontos de atenção (o que precisa de foco)
4. 3 prioridades recomendadas para a próxima semana`

  const start = Date.now()
  const message = await anthropic.messages.create({
    model: REVIEW_MODEL,
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  })
  const durationMs = Date.now() - start
  const content = message.content[0]
  if (content.type !== "text") return "Erro ao gerar revisão."

  trackUsage(REVIEW_MODEL, "weekly_review", message.usage.input_tokens, message.usage.output_tokens, durationMs, userId).catch(() => {})

  await db.aiInsight.create({
    data: { userId, module: "weekly", type: "review", content: content.text },
  })

  return content.text
}

export async function generateModuleInsight(userId: string, module: "tasks" | "finance" | "studies" | "content"): Promise<string> {
  let contextData = ""
  if (module === "tasks") {
    const stats = await getTaskStats(userId)
    contextData = `Tarefas: ${stats.total} total, ${stats.todo} pendentes, ${stats.inProgress} em andamento, ${stats.done} concluídas`
  } else if (module === "finance") {
    const summary = await getFinanceSummary(userId)
    const byCategory = await getExpensesByCategory(userId)
    contextData = `Financeiro: Receitas R$${summary.totalIncome.toFixed(2)}, Despesas R$${summary.totalExpense.toFixed(2)}, Saldo R$${summary.balance.toFixed(2)}. Top categorias: ${byCategory.slice(0,3).map(c => `${c.category}: R$${c.amount.toFixed(2)}`).join(", ")}`
  } else if (module === "studies") {
    const stats = await getReferenceStats(userId)
    contextData = `Biblioteca: ${stats.total} itens, ${stats.unread} não lidos, ${stats.read} lidos`
  } else if (module === "content") {
    const stats = await getContentStats(userId)
    contextData = `Conteúdo: ${stats.total} total, ${stats.ideas} ideias, ${stats.inProduction} em produção, ${stats.published} publicados`
  }

  const start = Date.now()
  const message = await anthropic.messages.create({
    model: REVIEW_MODEL,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Você é um assistente de produtividade. Analise estes dados e gere 3 insights acionáveis em português, diretos e práticos. Dados: ${contextData}`,
    }],
  })
  const durationMs = Date.now() - start
  const content = message.content[0]
  if (content.type !== "text") return "Erro ao gerar insight."

  trackUsage(REVIEW_MODEL, `module_insight_${module}`, message.usage.input_tokens, message.usage.output_tokens, durationMs, userId).catch(() => {})

  await db.aiInsight.create({
    data: { userId, module, type: "insight", content: content.text },
  })
  return content.text
}

export async function generateContentSuggestion(systemPrompt: string, userPrompt: string): Promise<string> {
  const start = Date.now()
  const message = await anthropic.messages.create({
    model: REVIEW_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })
  const durationMs = Date.now() - start
  const content = message.content[0]
  if (content.type !== "text") return "Erro ao gerar sugestão."

  trackUsage(REVIEW_MODEL, "content_suggestion", message.usage.input_tokens, message.usage.output_tokens, durationMs).catch(() => {})
  return content.text
}


// ═══════════════════════════════════════════════════════════════════════
// IDEAS PIPELINE — 4 stages:
//   Stage 1 (node):    discovery via Google News RSS
//   Stage 2 (Claude):  triage — lê cada candidato via web_fetch, classifica
//   Stage 3 (Claude):  deep research — busca fontes de apoio (triangulação)
//   Stage 4 (Claude):  narrative — constrói ideias sobre os grupos
// ═══════════════════════════════════════════════════════════════════════

import { discoverCandidates, type FeedItem } from "./news-feed.service"

const BLOCKED_DOMAINS = [
  "pinterest.com", "pinterest.com.br",
  "quora.com",
  "reclameaqui.com.br",
  "yahoo.com",
]

// ─── Stage 2: triagem ──────────────────────────────────────────────────

const TriageItemSchema = z.object({
  candidateIndex: z.number().describe("Índice do candidato na lista fornecida no prompt (0-based)"),
  canonicalUrl: z.string().describe("URL CANÔNICA da matéria após seguir redirects. Extraia do meta og:url ou da URL final do web_fetch."),
  title: z.string().describe("Título real da matéria (no corpo — pode ser mais preciso que o do feed)"),
  publishedAt: z.string().describe("ISO 8601 se possível. Use a data visível no artigo."),
  summary: z.string().describe("Resumo 2-3 frases do CORPO que você leu"),
  keyQuote: z.string().describe("Trecho verbatim (10-40 palavras) do corpo da matéria"),
  sourceAuthority: z.enum(["TIER_1", "TIER_2", "BLOG", "AGGREGATOR", "UNKNOWN"]),
  language: z.enum(["pt-BR", "en", "es"]),
  relevanceScore: z.number().describe("0-100: quão DIRETAMENTE a matéria se relaciona com o termo. Abaixo de 70 = rejeitar."),
  pioneerPotential: z.number().describe("0-100: potencial de virar conteúdo pioneiro"),
  freshnessHours: z.number(),
  topicKeywords: z.array(z.string()).describe("3-6 palavras-chave do TEMA (nomes próprios, eventos) — pro aprofundamento"),
  reject: z.boolean(),
  rejectReason: z.string().optional(),
})
const TriageResponseSchema = z.object({ items: z.array(TriageItemSchema) })
type TriageItem = z.infer<typeof TriageItemSchema>

function buildTriageSystemPrompt(): string {
  return `Você é ANALISTA DE NOTÍCIAS. Recebe uma lista de candidatos (pré-selecionados por feeds RSS determinísticos) e precisa LER cada um via web_fetch e classificar.

REGRAS INEGOCIÁVEIS
- VOCÊ NÃO GERA IDEIAS DE CONTEÚDO. Apenas avalia.
- Para cada candidato, use web_fetch NA URL fornecida. Se falhar, marque reject=true.
- canonicalUrl: extraia do meta og:url ou do URL final pós-redirect.
- keyQuote DEVE ser verbatim do corpo. Se não consegue citar, você não leu.
- relevanceScore honesto: 90+ só se DIRETAMENTE sobre o termo. Tangencial (o termo aparece mas não é foco) = 60-70 → rejeitar.
- reject=true se: relevance<70, falhou leitura, é opinião sem fato, repost, > 72h.
- topicKeywords: específicos do FATO (nome evento, pessoa, produto) pro aprofundamento.

FORMATO: JSON { items: [...] }.`
}

async function runTriagePhase(opts: { candidates: FeedItem[]; userId: string }): Promise<{
  items: (TriageItem & { candidate: FeedItem })[]
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number; fetchesUsed: number }
}> {
  const { candidates, userId } = opts
  if (candidates.length === 0) return { items: [], usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, fetchesUsed: 0 } }

  const userPrompt = `${candidates.length} CANDIDATOS (lista FIXA do RSS; NÃO invente outros):

${candidates.map((c, i) => `[${i}] term="${c.term}" (${c.locale}) · ${c.source} · pub ${c.pubDate?.toISOString() ?? "?"}
    Título: ${c.title}
    URL: ${c.url}
    Snippet RSS: ${c.description.slice(0, 200)}`).join("\n")}

Execute web_fetch em cada URL, extraia os dados e retorne o JSON. Rejeite liberalmente.`

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }]
  const totals = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
  let fetchesUsed = 0
  let finalText: string | null = null
  const start = Date.now()

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: IDEAS_MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: buildTriageSystemPrompt(), cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(TriageResponseSchema), effort: "medium" },
      tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: candidates.length + 2, max_content_tokens: 5000, blocked_domains: BLOCKED_DOMAINS }],
      messages,
    })
    totals.input += response.usage.input_tokens
    totals.output += response.usage.output_tokens
    totals.cacheRead += response.usage.cache_read_input_tokens ?? 0
    totals.cacheCreation += response.usage.cache_creation_input_tokens ?? 0
    for (const b of response.content) {
      if (b.type === "server_tool_use" && b.name === "web_fetch") fetchesUsed++
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content })
      continue
    }
    const tb = [...response.content].reverse().find((b): b is Anthropic.TextBlock => b.type === "text")
    if (!tb) throw new Error(`triage: sem text (stop=${response.stop_reason})`)
    finalText = tb.text
    break
  }
  const durationMs = Date.now() - start
  if (!finalText) throw new Error("triage: pause_turn loop exceeded")

  let parsed: z.infer<typeof TriageResponseSchema>
  try { parsed = TriageResponseSchema.parse(JSON.parse(finalText)) }
  catch (err) {
    console.error("[triage] parse:", err, "raw:", finalText.slice(0, 400))
    throw new Error("Falha ao parsear triagem")
  }

  const items = parsed.items
    .filter((it) => !it.reject && it.relevanceScore >= 70 && it.candidateIndex >= 0 && it.candidateIndex < candidates.length)
    .map((it) => ({ ...it, candidate: candidates[it.candidateIndex] }))

  trackUsage(IDEAS_MODEL, "triage_phase", totals.input, totals.output, durationMs, userId, {
    cacheReadTokens: totals.cacheRead, cacheCreationTokens: totals.cacheCreation,
    fetchesUsed, itemsQualified: items.length, itemsTotal: candidates.length,
  }).catch(() => {})

  return { items, usage: { inputTokens: totals.input, outputTokens: totals.output, cacheReadTokens: totals.cacheRead, cacheCreationTokens: totals.cacheCreation, fetchesUsed } }
}

// ─── Stage 3: aprofundamento (triangulação) ────────────────────────────

const SupportingSourceSchema = z.object({
  primaryIndex: z.number().describe("Índice do item primário na lista QUALIFIED"),
  url: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  summary: z.string(),
  keyQuote: z.string(),
  sourceAuthority: z.enum(["TIER_1", "TIER_2", "BLOG", "AGGREGATOR", "UNKNOWN"]),
  language: z.enum(["pt-BR", "en", "es"]),
  agreementScore: z.number().describe("0-100: quão fortemente CONFIRMA o fato do primário"),
  addsInfo: z.string().optional().describe("O que esta fonte acrescenta"),
  reject: z.boolean(),
})
const DeepResearchResponseSchema = z.object({ sources: z.array(SupportingSourceSchema) })

function buildDeepResearchSystemPrompt(): string {
  return `Você é PESQUISADOR DE TRIANGULAÇÃO. Recebe matérias validadas e busca 1-2 fontes adicionais que CONFIRMEM o mesmo fato.

REGRAS
- Use web_search com as topicKeywords do primário (não o term genérico).
- web_fetch nas 1-2 mais promissoras.
- agreementScore: quão fortemente CORROBORA o mesmo fato. Não é similaridade — é confirmação factual.
- Priorize fontes DIFERENTES do veículo primário.
- Rejeite: repost, agregador, contradição especulativa, tangencial.
- Se não achar fonte, retorne sources=[] pra aquele primário. Isso é OK (notícia solitária).

FORMATO: JSON { sources: [...] }.`
}

async function runDeepResearchPhase(opts: {
  qualified: (TriageItem & { candidate: FeedItem })[]
  userId: string
}): Promise<{
  sources: (z.infer<typeof SupportingSourceSchema> & { primary: TriageItem & { candidate: FeedItem } })[]
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number; searchesUsed: number; fetchesUsed: number }
}> {
  const { qualified, userId } = opts
  if (qualified.length === 0) return { sources: [], usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, searchesUsed: 0, fetchesUsed: 0 } }

  const userPrompt = `${qualified.length} MATÉRIAS QUALIFICADAS — busque fontes de apoio:

${qualified.map((q, i) => `[${i}] term="${q.candidate.term}" · rel=${q.relevanceScore} · pioneer=${q.pioneerPotential}
    Título: ${q.title}
    URL: ${q.canonicalUrl}
    Resumo: ${q.summary}
    Keywords: ${q.topicKeywords.join(", ")}`).join("\n\n")}

Use web_search com as keywords de cada primário, web_fetch em 1-2 resultados, retorne APENAS fontes que corroboram (agreement ≥ 70).`

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }]
  const totals = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
  let searchesUsed = 0, fetchesUsed = 0
  let finalText: string | null = null
  const start = Date.now()

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: IDEAS_MODEL,
      max_tokens: 12000,
      system: [{ type: "text", text: buildDeepResearchSystemPrompt(), cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(DeepResearchResponseSchema), effort: "medium" },
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: qualified.length * 2, blocked_domains: BLOCKED_DOMAINS },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: qualified.length * 2, max_content_tokens: 4000, blocked_domains: BLOCKED_DOMAINS },
      ],
      messages,
    })
    totals.input += response.usage.input_tokens
    totals.output += response.usage.output_tokens
    totals.cacheRead += response.usage.cache_read_input_tokens ?? 0
    totals.cacheCreation += response.usage.cache_creation_input_tokens ?? 0
    for (const b of response.content) {
      if (b.type === "server_tool_use") {
        if (b.name === "web_search") searchesUsed++
        else if (b.name === "web_fetch") fetchesUsed++
      }
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content })
      continue
    }
    const tb = [...response.content].reverse().find((b): b is Anthropic.TextBlock => b.type === "text")
    if (!tb) throw new Error(`deep: sem text (stop=${response.stop_reason})`)
    finalText = tb.text
    break
  }
  const durationMs = Date.now() - start
  if (!finalText) throw new Error("deep: pause_turn loop exceeded")

  let parsed: z.infer<typeof DeepResearchResponseSchema>
  try { parsed = DeepResearchResponseSchema.parse(JSON.parse(finalText)) }
  catch { throw new Error("Falha ao parsear fontes de apoio") }

  const sources = parsed.sources
    .filter((s) => !s.reject && s.agreementScore >= 70 && s.primaryIndex >= 0 && s.primaryIndex < qualified.length)
    .map((s) => ({ ...s, primary: qualified[s.primaryIndex] }))

  trackUsage(IDEAS_MODEL, "deep_research_phase", totals.input, totals.output, durationMs, userId, {
    cacheReadTokens: totals.cacheRead, cacheCreationTokens: totals.cacheCreation,
    searchesUsed, fetchesUsed, supportingFound: sources.length,
  }).catch(() => {})

  return {
    sources,
    usage: { inputTokens: totals.input, outputTokens: totals.output, cacheReadTokens: totals.cacheRead, cacheCreationTokens: totals.cacheCreation, searchesUsed, fetchesUsed },
  }
}

// ─── Stage 4: narrativa (sem tools) ────────────────────────────────────

const NarrativeIdeaSchema = z.object({
  groupIndex: z.number(),
  title: z.string(),
  summary: z.string(),
  angle: z.string(),
  hook: z.string(),
  relevance: z.string(),
  evidenceQuote: z.string(),
  pioneerScore: z.number(),
})
const NarrativeResponseSchema = z.object({ ideas: z.array(NarrativeIdeaSchema) })

function buildNarrativeSystemPrompt(): string {
  return `Você é ESTRATEGISTA DE CONTEÚDO. Recebe GRUPOS (primário + apoios) e constrói ideias pioneiras.

REGRAS
- CADA ideia aponta pro groupIndex.
- evidenceQuote = verbatim do keyQuote do primário.
- Apoios enriquecem o ângulo (o que uma traz que outra não).
- pioneerScore maior com: fresh<48h + apoios + tier-1 + lacuna PT + angle único.
- Não gere ideia se grupo for fraco.
- Contrarian > óbvio. Evite "o que você precisa saber sobre X".

FORMATO: JSON { ideas: [...] }.`
}

interface NarrativeGroup {
  primary: TriageItem & { candidate: FeedItem }
  supporting: (z.infer<typeof SupportingSourceSchema> & { primary: TriageItem & { candidate: FeedItem } })[]
}

async function runNarrativePhase(opts: { groups: NarrativeGroup[]; userId: string }): Promise<{
  ideas: (z.infer<typeof NarrativeIdeaSchema> & { group: NarrativeGroup })[]
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number }
}> {
  const { groups, userId } = opts
  if (groups.length === 0) return { ideas: [], usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 } }

  const userPrompt = `${groups.length} GRUPOS:

${groups.map((g, i) => `[${i}] term="${g.primary.candidate.term}" · autoridade=${g.primary.sourceAuthority} · fresh=${g.primary.freshnessHours}h · apoios=${g.supporting.length}

  PRIMÁRIO: ${g.primary.title}
    URL: ${g.primary.canonicalUrl}
    Resumo: ${g.primary.summary}
    Quote: "${g.primary.keyQuote}"

  APOIOS:
${g.supporting.length === 0 ? "    (notícia solitária)" : g.supporting.map((s) => `    - ${s.title} [${s.sourceAuthority}]
      "${s.keyQuote}"
      ${s.addsInfo ? `Adiciona: ${s.addsInfo}` : ""}`).join("\n")}
`).join("\n")}

Gere ideias. Pode pular grupos fracos. Qualidade > quantidade.`

  const start = Date.now()
  const response = await anthropic.messages.create({
    model: IDEAS_MODEL,
    max_tokens: 6000,
    system: [{ type: "text", text: buildNarrativeSystemPrompt(), cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(NarrativeResponseSchema), effort: "medium" },
    messages: [{ role: "user", content: userPrompt }],
  })
  const durationMs = Date.now() - start
  const tb = [...response.content].reverse().find((b): b is Anthropic.TextBlock => b.type === "text")
  if (!tb) throw new Error("narrative: sem text")

  let parsed: z.infer<typeof NarrativeResponseSchema>
  try { parsed = NarrativeResponseSchema.parse(JSON.parse(tb.text)) }
  catch { throw new Error("Falha ao parsear ideias") }

  const ideas = parsed.ideas
    .filter((i) => i.groupIndex >= 0 && i.groupIndex < groups.length)
    .map((i) => ({ ...i, group: groups[i.groupIndex] }))

  trackUsage(IDEAS_MODEL, "narrative_phase", response.usage.input_tokens, response.usage.output_tokens, durationMs, userId, {
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    ideasReturned: ideas.length,
  }).catch(() => {})

  return {
    ideas,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  }
}

// ─── Orquestrador público ──────────────────────────────────────────────

export interface ResearchedIdea {
  title: string
  summary: string
  angle: string
  hook: string
  term: string
  relevance: string
  sourceUrl: string
  sourceTitle: string
  publishedAt: string
  language: "pt-BR" | "en" | "es"
  pioneerScore: number
  evidenceId: string
  evidenceQuote: string
  supportingEvidenceIds: string[]
}

interface GenerateIdeasOptions {
  terms: string[]
  ideasPerTerm?: number
  language?: "pt-BR" | "en" | "both"
  hoursWindow?: number
  userId?: string
}

export async function generateIdeasWithResearch(opts: GenerateIdeasOptions): Promise<{
  ideas: ResearchedIdea[]
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheCreationTokens: number
    searchesUsed: number
    fetchesUsed: number
    evidencesCaptured: number
    candidatesFromRss: number
    qualifiedAfterTriage: number
    supportingFound: number
  }
}> {
  const { terms, hoursWindow = 72, userId } = opts
  if (!userId) throw new Error("userId obrigatório")
  const empty = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, searchesUsed: 0, fetchesUsed: 0, evidencesCaptured: 0, candidatesFromRss: 0, qualifiedAfterTriage: 0, supportingFound: 0 }
  if (terms.length === 0) return { ideas: [], usage: empty }

  // Stage 1 — discovery
  const candidates = await discoverCandidates({ terms, hoursWindow, perTerm: 5, perTermEn: 3 })
  console.log(`[pipeline] stage1: ${candidates.length} candidatos RSS`)
  if (candidates.length === 0) return { ideas: [], usage: empty }

  // Stage 2 — triagem
  const triage = await runTriagePhase({ candidates, userId })
  console.log(`[pipeline] stage2: ${triage.items.length} qualificados de ${candidates.length}`)
  if (triage.items.length === 0) {
    return {
      ideas: [],
      usage: { ...empty, inputTokens: triage.usage.inputTokens, outputTokens: triage.usage.outputTokens, cacheReadTokens: triage.usage.cacheReadTokens, cacheCreationTokens: triage.usage.cacheCreationTokens, fetchesUsed: triage.usage.fetchesUsed, candidatesFromRss: candidates.length },
    }
  }

  // Stage 3 — aprofundamento
  const deep = await runDeepResearchPhase({ qualified: triage.items, userId })
  console.log(`[pipeline] stage3: ${deep.sources.length} fontes de apoio`)

  // Persiste primários
  const primaryToEvId = new Map<number, string>()
  for (let idx = 0; idx < triage.items.length; idx++) {
    const it = triage.items[idx]
    try {
      const saved = await db.newsEvidence.upsert({
        where: { userId_url: { userId, url: it.canonicalUrl } },
        update: { title: it.title, summary: it.summary, keyQuote: it.keyQuote, relevanceScore: it.relevanceScore, freshnessHours: it.freshnessHours },
        create: {
          userId, term: it.candidate.term, url: it.canonicalUrl, title: it.title,
          publishedAt: it.publishedAt ? new Date(it.publishedAt) : null,
          summary: it.summary, keyQuote: it.keyQuote,
          sourceAuthority: it.sourceAuthority, language: it.language,
          relevanceScore: it.relevanceScore, freshnessHours: it.freshnessHours,
        },
      })
      primaryToEvId.set(idx, saved.id)
    } catch (err) { console.warn("[primary upsert fail]", (err as Error).message) }
  }

  // Persiste apoios
  const supportingIdsByPrimary = new Map<number, string[]>()
  for (const s of deep.sources) {
    try {
      const saved = await db.newsEvidence.upsert({
        where: { userId_url: { userId, url: s.url } },
        update: { title: s.title, summary: s.summary, keyQuote: s.keyQuote, relevanceScore: s.agreementScore },
        create: {
          userId, term: s.primary.candidate.term, url: s.url, title: s.title,
          publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
          summary: s.summary, keyQuote: s.keyQuote,
          sourceAuthority: s.sourceAuthority, language: s.language,
          relevanceScore: s.agreementScore, freshnessHours: s.primary.freshnessHours,
        },
      })
      const arr = supportingIdsByPrimary.get(s.primaryIndex) ?? []
      arr.push(saved.id)
      supportingIdsByPrimary.set(s.primaryIndex, arr)
    } catch (err) { console.warn("[supporting upsert fail]", (err as Error).message) }
  }

  // Stage 4 — narrativa
  const groups: NarrativeGroup[] = triage.items.map((primary, idx) => ({
    primary, supporting: deep.sources.filter((s) => s.primaryIndex === idx),
  }))
  const narr = await runNarrativePhase({ groups, userId })
  console.log(`[pipeline] stage4: ${narr.ideas.length} ideias`)

  const ideas: ResearchedIdea[] = []
  for (const i of narr.ideas) {
    const evId = primaryToEvId.get(i.groupIndex)
    if (!evId) continue
    const supIds = supportingIdsByPrimary.get(i.groupIndex) ?? []
    const p = i.group.primary
    ideas.push({
      title: i.title, summary: i.summary, angle: i.angle, hook: i.hook,
      term: p.candidate.term, relevance: i.relevance,
      sourceUrl: p.canonicalUrl, sourceTitle: p.title,
      publishedAt: p.publishedAt, language: p.language,
      pioneerScore: Math.max(0, Math.min(100, Math.round(i.pioneerScore))),
      evidenceId: evId, evidenceQuote: i.evidenceQuote,
      supportingEvidenceIds: supIds,
    })
  }

  const processedIds = [...primaryToEvId.values(), ...[...supportingIdsByPrimary.values()].flat()]
  if (processedIds.length > 0) {
    await db.newsEvidence.updateMany({ where: { id: { in: processedIds } }, data: { processed: true } })
  }

  return {
    ideas,
    usage: {
      inputTokens: triage.usage.inputTokens + deep.usage.inputTokens + narr.usage.inputTokens,
      outputTokens: triage.usage.outputTokens + deep.usage.outputTokens + narr.usage.outputTokens,
      cacheReadTokens: triage.usage.cacheReadTokens + deep.usage.cacheReadTokens + narr.usage.cacheReadTokens,
      cacheCreationTokens: triage.usage.cacheCreationTokens + deep.usage.cacheCreationTokens + narr.usage.cacheCreationTokens,
      searchesUsed: deep.usage.searchesUsed,
      fetchesUsed: triage.usage.fetchesUsed + deep.usage.fetchesUsed,
      evidencesCaptured: primaryToEvId.size + [...supportingIdsByPrimary.values()].flat().length,
      candidatesFromRss: candidates.length,
      qualifiedAfterTriage: triage.items.length,
      supportingFound: deep.sources.length,
    },
  }
}


// ─── Usage tracking (model-aware) ──────────────────────────────────────

async function trackUsage(
  model: ModelId,
  action: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  userId?: string,
  extra?: Record<string, number>,
) {
  const pricing = MODELS[model] ?? MODELS["claude-sonnet-4-6"]
  const costUsd = inputTokens * pricing.input + outputTokens * pricing.output
  try {
    const uid = userId || (await db.user.findFirst({ select: { id: true } }))?.id
    if (!uid) return
    await db.apiUsage.create({
      data: {
        action: extra ? `${action}:${JSON.stringify(extra)}` : action,
        model,
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
        userId: uid,
      },
    })
  } catch {}
}

export { trackUsage }

export async function getAiInsights(userId: string) {
  return db.aiInsight.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
}

export async function reactToInsight(id: string, reaction: string) {
  return db.aiInsight.update({ where: { id }, data: { reaction } })
}
