/**
 * AI Service — capacidades da Claude API organizadas pra contexto pedagógico.
 *
 * Features ativadas:
 *   - web_search_20260209     → BNCC, currículos, referências pedagógicas
 *   - web_fetch_20260209      → leitura de documento específico (PDF BNCC, guia escolar)
 *   - Vision (image_url/base64) → foto do caderno do aluno
 *   - PDF (document)          → prova/apostila em PDF
 *   - Structured outputs (Zod) → relatórios, planos, atividades em formato consistente
 *   - Prompt caching          → perfil do aluno + BNCC estáveis entre chamadas
 *   - Adaptive thinking        → raciocínio sobre múltiplas observações
 *   - Batches API             → gerar 25 relatórios overnight com 50% de desconto
 *   - trackUsage              → auditoria de custo model-aware
 *
 * Modelo default: claude-opus-4-7 (override via TEACHING_MODEL env).
 */

import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { db } from "@/lib/db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Model registry + pricing ────────────────────────────────────────────
const MODELS = {
  "claude-opus-4-7":   { input: 5 / 1_000_000, output: 25 / 1_000_000 },
  "claude-opus-4-6":   { input: 5 / 1_000_000, output: 25 / 1_000_000 },
  "claude-sonnet-4-6": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  "claude-haiku-4-5":  { input: 1 / 1_000_000, output: 5 / 1_000_000 },
} as const
type ModelId = keyof typeof MODELS

const MODEL: ModelId = (process.env.TEACHING_MODEL as ModelId) || "claude-opus-4-7"

// ═══════════════════════════════════════════════════════════════════════
// FEATURE: Structured output genérico com adaptive thinking + caching
// ═══════════════════════════════════════════════════════════════════════

interface StructuredOptions<S extends z.ZodType> {
  schema: S
  systemPrompt: string   // cacheado
  userPrompt: string     // volátil
  effort?: "low" | "medium" | "high" | "max"
  maxTokens?: number
  userId?: string
  action: string         // pra tracking
  useWebSearch?: boolean
  useWebFetch?: boolean
  blockedDomains?: string[]
}

export async function generateStructured<S extends z.ZodType>(
  opts: StructuredOptions<S>,
): Promise<z.infer<S>> {
  const {
    schema, systemPrompt, userPrompt,
    effort = "high", maxTokens = 16000, userId, action,
    useWebSearch = false, useWebFetch = false,
    blockedDomains = ["pinterest.com", "pinterest.com.br", "quora.com"],
  } = opts

  const tools: Anthropic.Messages.ToolUnion[] = []
  if (useWebSearch) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 6, blocked_domains: blockedDomains })
  if (useWebFetch) tools.push({ type: "web_fetch_20260209", name: "web_fetch", max_uses: 6, max_content_tokens: 8000 })

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }]
  const totals = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
  const start = Date.now()
  let finalText: string | null = null

  for (let i = 0; i < 5; i++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(schema), effort },
      ...(tools.length > 0 ? { tools } : {}),
      messages,
    })

    totals.input += res.usage.input_tokens
    totals.output += res.usage.output_tokens
    totals.cacheRead += res.usage.cache_read_input_tokens ?? 0
    totals.cacheCreation += res.usage.cache_creation_input_tokens ?? 0

    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content })
      continue
    }

    const textBlock = [...res.content].reverse().find((b): b is Anthropic.TextBlock => b.type === "text")
    if (!textBlock) throw new Error(`generateStructured: no final text (stop=${res.stop_reason})`)
    finalText = textBlock.text
    break
  }

  const durationMs = Date.now() - start
  if (!finalText) throw new Error("generateStructured: server-tool loop exceeded")

  let parsed: z.infer<S>
  try {
    parsed = schema.parse(JSON.parse(finalText))
  } catch (err) {
    console.error(`[ai.${action}] parse error`, err, "raw:", finalText.slice(0, 500))
    throw new Error("Falha ao parsear resposta da IA")
  }

  trackUsage(MODEL, action, totals.input, totals.output, durationMs, userId, {
    cacheReadTokens: totals.cacheRead,
    cacheCreationTokens: totals.cacheCreation,
  }).catch(() => {})

  return parsed
}

// ═══════════════════════════════════════════════════════════════════════
// FEATURE: Texto livre (sem structured output) — rascunhos rápidos
// ═══════════════════════════════════════════════════════════════════════

export async function generateText(opts: {
  systemPrompt: string
  userPrompt: string
  effort?: "low" | "medium" | "high" | "max"
  maxTokens?: number
  userId?: string
  action: string
}): Promise<string> {
  const { systemPrompt, userPrompt, effort = "medium", maxTokens = 4000, userId, action } = opts
  const start = Date.now()
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { effort },
    messages: [{ role: "user", content: userPrompt }],
  })
  const durationMs = Date.now() - start

  const textBlock = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")
  if (!textBlock) throw new Error("generateText: no text output")

  trackUsage(MODEL, action, res.usage.input_tokens, res.usage.output_tokens, durationMs, userId, {
    cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: res.usage.cache_creation_input_tokens ?? 0,
  }).catch(() => {})

  return textBlock.text
}

// ═══════════════════════════════════════════════════════════════════════
// FEATURE: Vision — analisar foto de caderno / atividade do aluno
// ═══════════════════════════════════════════════════════════════════════

export async function analyzeImage(opts: {
  imageUrl?: string
  imageBase64?: { data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" }
  systemPrompt: string
  userPrompt: string
  userId?: string
  action: string
  maxTokens?: number
}): Promise<string> {
  const { imageUrl, imageBase64, systemPrompt, userPrompt, userId, action, maxTokens = 4000 } = opts
  if (!imageUrl && !imageBase64) throw new Error("analyzeImage: precisa de imageUrl OU imageBase64")

  const source: Anthropic.ImageBlockParam["source"] = imageUrl
    ? { type: "url", url: imageUrl }
    : { type: "base64", media_type: imageBase64!.mediaType, data: imageBase64!.data }

  const start = Date.now()
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{
      role: "user",
      content: [
        { type: "image", source },
        { type: "text", text: userPrompt },
      ],
    }],
  })
  const durationMs = Date.now() - start

  const textBlock = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")
  if (!textBlock) throw new Error("analyzeImage: no text output")

  trackUsage(MODEL, action, res.usage.input_tokens, res.usage.output_tokens, durationMs, userId).catch(() => {})
  return textBlock.text
}

// ═══════════════════════════════════════════════════════════════════════
// FEATURE: PDF — analisar prova, apostila, documento BNCC
// ═══════════════════════════════════════════════════════════════════════

export async function analyzePdf(opts: {
  pdfUrl?: string
  pdfBase64?: string
  systemPrompt: string
  userPrompt: string
  userId?: string
  action: string
  maxTokens?: number
}): Promise<string> {
  const { pdfUrl, pdfBase64, systemPrompt, userPrompt, userId, action, maxTokens = 6000 } = opts
  if (!pdfUrl && !pdfBase64) throw new Error("analyzePdf: precisa de pdfUrl OU pdfBase64")

  const source: Anthropic.DocumentBlockParam["source"] = pdfUrl
    ? { type: "url", url: pdfUrl }
    : { type: "base64", media_type: "application/pdf", data: pdfBase64! }

  const start = Date.now()
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{
      role: "user",
      content: [
        { type: "document", source },
        { type: "text", text: userPrompt },
      ],
    }],
  })
  const durationMs = Date.now() - start

  const textBlock = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")
  if (!textBlock) throw new Error("analyzePdf: no text output")

  trackUsage(MODEL, action, res.usage.input_tokens, res.usage.output_tokens, durationMs, userId).catch(() => {})
  return textBlock.text
}

// ═══════════════════════════════════════════════════════════════════════
// FEATURE: Batches API — geração em lote (ex: 25 relatórios a 50% do custo)
// ═══════════════════════════════════════════════════════════════════════

export async function createBatchReports(requests: Array<{
  customId: string
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}>) {
  const batch = await anthropic.messages.batches.create({
    requests: requests.map((r) => ({
      custom_id: r.customId,
      params: {
        model: MODEL,
        max_tokens: r.maxTokens ?? 4000,
        system: [{ type: "text", text: r.systemPrompt, cache_control: { type: "ephemeral" } }],
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        messages: [{ role: "user", content: r.userPrompt }],
      },
    })),
  })
  return { id: batch.id, status: batch.processing_status }
}

export async function getBatchStatus(batchId: string) {
  return anthropic.messages.batches.retrieve(batchId)
}

export async function* streamBatchResults(batchId: string) {
  for await (const result of await anthropic.messages.batches.results(batchId)) {
    yield result
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS compartilhados (Zod) — tipagem + server-side constraint
// ═══════════════════════════════════════════════════════════════════════

/** Relatório descritivo completo de um aluno no período */
export const DescriptiveReportSchema = z.object({
  socioEmotional: z.string().describe("Desenvolvimento sócio-emocional — autonomia, autoestima, relacionamentos"),
  academic: z.string().describe("Aproveitamento acadêmico geral — visão macro do período"),
  language: z.string().describe("Língua Portuguesa — leitura, escrita, produção textual, interpretação"),
  math: z.string().describe("Matemática — operações, resolução de problemas, raciocínio lógico"),
  science: z.string().describe("Ciências da Natureza — curiosidade, observação, experimentação"),
  socialStudies: z.string().describe("História e Geografia — compreensão de espaço, tempo, sociedade"),
  arts: z.string().describe("Artes — expressão, criatividade, apreciação"),
  physicalEd: z.string().describe("Educação Física — coordenação, cooperação, participação"),
  participation: z.string().describe("Participação e autonomia em sala"),
  conclusion: z.string().describe("Conclusão geral + recomendações pedagógicas para o próximo período"),
})

/** Plano de aula estruturado com BNCC */
export const LessonPlanSchema = z.object({
  title: z.string(),
  subject: z.string(),
  duration: z.number().describe("Duração estimada em minutos"),
  bnccCodes: z.array(z.string()).describe("Códigos BNCC aplicáveis, ex: EF03LP01"),
  objectives: z.string().describe("Objetivos de aprendizagem — o que o aluno deve saber/fazer ao final"),
  skills: z.string().describe("Habilidades BNCC desenvolvidas (descrição textual)"),
  content: z.string().describe("Conteúdo/assunto da aula"),
  methodology: z.string().describe("Metodologia de ensino — como será conduzida"),
  materials: z.string().describe("Materiais necessários"),
  activities: z.string().describe("Passo a passo detalhado da aula"),
  assessment: z.string().describe("Como avaliar a compreensão dos alunos"),
  homework: z.string().optional().describe("Dever de casa (se aplicável)"),
  adaptations: z.string().optional().describe("Adaptações para alunos com necessidades específicas"),
  citations: z.array(z.object({
    source: z.string(),
    ref: z.string(),
    url: z.string().optional(),
  })).describe("Referências BNCC e outras citadas"),
})

/** Lista de exercícios/questões */
export const ActivityItemsSchema = z.object({
  instructions: z.string().describe("Enunciado geral da atividade"),
  items: z.array(z.object({
    number: z.number(),
    question: z.string(),
    type: z.enum(["MULTIPLE_CHOICE", "OPEN", "TRUE_FALSE", "MATCHING", "FILL_BLANK", "DRAWING"]),
    options: z.array(z.string()).optional(),
    answer: z.string().optional(),
    tip: z.string().optional(),
  })),
  estimatedMin: z.number(),
  bnccCodes: z.array(z.string()),
})

/** Rascunho de comunicação com pais */
export const CommunicationDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  tone: z.enum(["FORMAL", "EMPATICO", "INFORMATIVO", "ALERTA"]),
  callToAction: z.string().optional().describe("Ação esperada do responsável, se houver"),
})

/** Correção de atividade do aluno */
export const CorrectionSchema = z.object({
  grade: z.string().describe("Nota ou conceito (ex: 'A', 'Satisfatório', '8.5')"),
  feedback: z.string().describe("Feedback individualizado, em tom construtivo e apropriado para criança"),
  strengths: z.string().describe("Pontos fortes identificados no trabalho"),
  improvements: z.string().describe("O que precisa melhorar, com sugestões práticas"),
  bnccAlignment: z.array(z.string()).describe("Códigos BNCC atingidos (parcial ou totalmente)"),
})

// ═══════════════════════════════════════════════════════════════════════
// Usage tracking
// ═══════════════════════════════════════════════════════════════════════

async function trackUsage(
  model: ModelId,
  action: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  userId?: string,
  extra?: { cacheReadTokens?: number; cacheCreationTokens?: number },
) {
  const pricing = MODELS[model]
  const costUsd = inputTokens * pricing.input + outputTokens * pricing.output
  try {
    const uid = userId || (await db.user.findFirst({ select: { id: true } }))?.id
    if (!uid) return
    await db.apiUsage.create({
      data: {
        action,
        model,
        inputTokens,
        outputTokens,
        cacheReadTokens: extra?.cacheReadTokens ?? 0,
        cacheCreationTokens: extra?.cacheCreationTokens ?? 0,
        costUsd,
        durationMs,
        userId: uid,
      },
    })
  } catch {}
}

export { trackUsage, MODEL as TEACHING_MODEL }
