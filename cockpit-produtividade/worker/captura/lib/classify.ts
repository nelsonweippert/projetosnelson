/**
 * Claude Haiku 4.5 — classification + structured extraction.
 *
 * Tool-based output: forçamos o modelo a chamar a tool `capture` cujo
 * input_schema retorna `items[]` (multi-intent). Cada item é um dos 5
 * tipos: task | event | study_session | note | ambiguous.
 * Validamos com Zod por garantia.
 */

import Anthropic from "@anthropic-ai/sdk"
import { CapturedBatchSchema, type CapturedItem } from "../schema/captured-item.js"

let client: Anthropic | null = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export type UserContext = {
  areas?: string[]
  studies?: string[]
  contacts?: string[]
  vocabulary?: string[]
  timezone?: string
}

const ITEM_VARIANTS = [
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
      area_hint: { type: ["string", "null"] },
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
      type: { const: "note" },
      note_type: {
        enum: ["FREE", "JOURNAL", "MEETING", "IDEA"],
        description:
          "FREE=geral; JOURNAL=reflexão pessoal/diário; MEETING=resumo de reunião; IDEA=ideia/insight",
      },
      title: { type: ["string", "null"] },
      content: { type: "string", description: "Conteúdo da nota (markdown leve OK)" },
      area_hints: {
        type: "array",
        items: { type: "string" },
        description: "Nomes de áreas relacionadas (max 3)",
      },
      contact_hint: {
        type: ["string", "null"],
        description:
          "Nome de contato cadastrado (cliente/parceiro/lead) mencionado na mensagem. APENAS valor da lista de contatos ou null. Crucial para follow-up.",
      },
    },
    required: ["type", "note_type", "content", "area_hints"],
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
]

const TOOL_DEF = {
  name: "capture",
  description:
    "Classifica a mensagem em 1+ itens (multi-intent). Cada item é task | event | study_session | note | ambiguous. Retorna items[].",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          oneOf: ITEM_VARIANTS,
        },
      },
    },
    required: ["items"],
  },
}

function buildSystemPrompt(ctx: UserContext = {}) {
  const {
    areas = [],
    studies = [],
    contacts = [],
    vocabulary = [],
    timezone = "America/Sao_Paulo",
  } = ctx
  const now = new Date().toISOString()

  return `Você é um classificador determinístico de mensagens da rotina diária.

[CONTEXTO]
Áreas ativas: ${areas.length ? areas.join(", ") : "(nenhuma)"}
Projetos de estudo ativos: ${studies.length ? studies.join(", ") : "(nenhum)"}
Contatos cadastrados: ${contacts.length ? contacts.join(", ") : "(nenhum)"}
Vocabulário: ${vocabulary.length ? vocabulary.join(", ") : "(nenhum)"}
Timezone: ${timezone}
Agora: ${now}

[TAREFA]
Decomponha a mensagem em 1+ itens (multi-intent). Cada item é UM tipo:
task | event | study_session | note | ambiguous.
Chame a tool "capture" passando items[].

[REGRAS GERAIS]
- Mensagem com múltiplas intenções ("amanhã reunião com X 14h e criar tarefa de slides") → 2+ items.
- Mensagem com 1 intenção → 1 item.
- Confiança individual < 60% para um pedaço → "ambiguous" só nesse pedaço.
- Datas relativas ("amanhã", "sexta") → ISO 8601 considerando timezone.
- area_hint: APENAS valor da lista de áreas ou null. Sem inventar.
- contact_hint: APENAS valor da lista de contatos ou null. Sem inventar.

[REGRAS POR TIPO]
- task: ação a executar ("pagar conta", "comprar X", "ligar pra Y"). priority LOW/MEDIUM/HIGH.
- event: tem horário/data fixa ("reunião 14h", "consulta 5/6 16h"). Sem data, vira task.
- study_session: relato de tempo já estudado ("estudei Rust 45min"). hours obrigatório (estimar). topic_hint deve casar com projeto ativo se houver.
- note:
  • Reflexão/insight pessoal sem ação direta → JOURNAL ou IDEA.
  • Resumo de conversa/reunião → MEETING (note_type=MEETING).
  • Pensamento solto, observação → FREE.
  • Ex: "estou cansado dessa semana" → JOURNAL.
  • Ex: "ideia: criar curso de Rust pra iniciantes" → IDEA.
  • Ex: "reunião com Pedro: decidimos lançar dia 15" → MEETING.
  • Use area_hints (array, max 3) com nomes da lista de áreas.
  • CONTATO: se a mensagem mencionar conversa/follow-up com contato cadastrado, preencha contact_hint com o nome EXATO da lista. É CRÍTICO para tracking de relacionamento.
  • Ex: "conversei com Pedro hoje sobre proposta" → note_type=MEETING, contact_hint="Pedro"
  • Ex: "Maria me mandou mensagem sobre projeto X" → contact_hint="Maria"
- ambiguous: só quando o pedaço é genuinamente irrecuperável. Suggestions com 2-3 alternativas.

[OUTPUT]
Sempre via tool "capture" com items[]. Não escreva texto fora.`
}

export async function classify(
  text: string,
  ctx: UserContext = {},
): Promise<{ items: CapturedItem[]; durationMs: number }> {
  const start = Date.now()
  const anthropic = getClient()

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: buildSystemPrompt(ctx),
    tools: [TOOL_DEF as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: "capture" },
    messages: [{ role: "user", content: text }],
  })

  const toolUse = res.content.find((b) => b.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("classify: modelo não chamou a tool 'capture'")
  }

  const parsed = CapturedBatchSchema.safeParse(toolUse.input)
  if (!parsed.success) {
    throw new Error(
      `classify: tool input inválido — ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    )
  }

  return { items: parsed.data.items, durationMs: Date.now() - start }
}
