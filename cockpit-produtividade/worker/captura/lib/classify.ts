/**
 * Claude Haiku 4.5 — classification + structured extraction.
 *
 * Tool-based output: forçamos o modelo a chamar a tool `capture` cujo
 * input_schema cobre os 4 tipos (task | event | study_session | ambiguous).
 * Validamos com Zod por garantia.
 */

import Anthropic from "@anthropic-ai/sdk"
import { CapturedItemSchema, type CapturedItem } from "../schema/captured-item.js"

let client: Anthropic | null = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export type UserContext = {
  areas?: string[]
  studies?: string[]
  vocabulary?: string[]
  timezone?: string
}

const TOOL_DEF = {
  name: "capture",
  description:
    "Classifica a mensagem do usuário em UM tipo (task | event | study_session | ambiguous) e extrai campos.",
  input_schema: {
    type: "object",
    oneOf: [
      {
        type: "object",
        properties: {
          type: { const: "task" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          priority: { enum: ["LOW", "MEDIUM", "HIGH"] },
          due_date: { type: ["string", "null"], description: "ISO 8601 se mencionado" },
          area_hint: { type: ["string", "null"] },
        },
        required: ["type", "title"],
      },
      {
        type: "object",
        properties: {
          type: { const: "event" },
          title: { type: "string" },
          date: { type: "string", description: "ISO 8601 obrigatório" },
          end_date: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          attendees: { type: "array", items: { type: "string" } },
          description: { type: ["string", "null"] },
        },
        required: ["type", "title", "date", "attendees"],
      },
      {
        type: "object",
        properties: {
          type: { const: "study_session" },
          topic_hint: { type: "string" },
          hours: { type: "number", minimum: 0.25, maximum: 24 },
          note: { type: ["string", "null"] },
        },
        required: ["type", "topic_hint", "hours"],
      },
      {
        type: "object",
        properties: {
          type: { const: "ambiguous" },
          suggestions: { type: "array", items: { type: "string" } },
          raw: { type: "string" },
        },
        required: ["type", "suggestions", "raw"],
      },
    ],
  },
}

function buildSystemPrompt(ctx: UserContext = {}) {
  const { areas = [], studies = [], vocabulary = [], timezone = "America/Sao_Paulo" } = ctx
  const now = new Date().toISOString()

  return `Você é um classificador determinístico de mensagens da rotina diária.

[CONTEXTO]
Áreas ativas: ${areas.length ? areas.join(", ") : "(nenhuma)"}
Projetos de estudo ativos: ${studies.length ? studies.join(", ") : "(nenhum)"}
Vocabulário: ${vocabulary.length ? vocabulary.join(", ") : "(nenhum)"}
Timezone: ${timezone}
Agora: ${now}

[TAREFA]
Classifique em UM dos tipos: task | event | study_session | ambiguous.
Chame a tool "capture" com schema correto.

[REGRAS]
- Confiança < 80% → "ambiguous" + suggestions com 2-3 alternativas.
- Multi-intent → "ambiguous".
- Datas relativas ("amanhã", "sexta") → resolva pra ISO 8601 considerando o timezone.
- Sem data num evento → vira "task".
- area_hint: APENAS valor da lista de áreas ou null.
- study_session: topic_hint deve casar com algum projeto ativo se houver match óbvio. hours obrigatório (estimar se não explícito).
- "Reunião com X amanhã 14h" → event com date ISO.
- "Estudei Rust 45min" → study_session, topic_hint "Rust", hours 0.75.
- "Pagar conta de luz" → task.
- task priority: LOW/MEDIUM/HIGH (default MEDIUM).

[OUTPUT]
Sempre via tool "capture". Não escreva texto fora.`
}

export async function classify(
  text: string,
  ctx: UserContext = {},
): Promise<{ item: CapturedItem; durationMs: number }> {
  const start = Date.now()
  const anthropic = getClient()

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: buildSystemPrompt(ctx),
    tools: [TOOL_DEF as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: "capture" },
    messages: [{ role: "user", content: text }],
  })

  const toolUse = res.content.find((b) => b.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("classify: modelo não chamou a tool 'capture'")
  }

  const parsed = CapturedItemSchema.safeParse(toolUse.input)
  if (!parsed.success) {
    throw new Error(
      `classify: tool input inválido — ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    )
  }

  return { item: parsed.data, durationMs: Date.now() - start }
}
