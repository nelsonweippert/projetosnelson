/**
 * Polish — reescreve transcrição de reunião em nota estruturada.
 *
 * Usado APÓS classify pra notas tipo MEETING. Sonnet 4.6 pega:
 *   - transcript original (Whisper output)
 *   - draftContent (o que o Haiku extraiu)
 *   - contexto (contato, área)
 * E devolve { title, content } via tool calling.
 *
 * Princípios:
 *   - 100% fidelidade aos fatos (não inventa)
 *   - Remove muleta de fala (tipo, né, aí), repetições
 *   - Estrutura: contexto / decisões / próximos passos quando aplicável
 *   - Tom profissional mas natural, primeira pessoa
 */

import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

const POLISH_TOOL = {
  name: "polish_note",
  description:
    "Devolve a nota de reunião reescrita: title conciso e content em markdown estruturado.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Título conciso descrevendo o assunto principal. ≤ 80 chars. Ex: 'Reunião com Pedro - cronograma Wraithfall'.",
      },
      content: {
        type: "string",
        description:
          "Conteúdo da nota em markdown leve, estruturado quando houver decisões/combinados/próximos passos. Mantenha 100% fidelidade aos fatos.",
      },
    },
    required: ["title", "content"],
  },
}

export type PolishContext = {
  transcript: string
  draftContent: string
  contactName?: string | null
  area?: string | null
}

export type PolishResult = {
  title: string
  content: string
  durationMs: number
  inputTokens: number
  outputTokens: number
}

export async function polishMeetingNote(
  ctx: PolishContext,
): Promise<PolishResult> {
  const start = Date.now()
  const ant = getClient()

  const sys = `Você é um redator que transforma transcrições de áudio em notas de reunião BEM ESCRITAS em português.

REGRAS DE FIDELIDADE:
- 100% fiel aos fatos do transcript. NÃO invente nomes, valores, datas, decisões.
- Se algo no transcript for ambíguo, mantenha a ambiguidade ou omita; não chute.

REGRAS DE ESCRITA:
- Reescreva em prosa clara e natural. Remova muletas de fala ("tipo", "né", "aí", "então", "sabe", "cara"), repetições e "ums".
- Tom: profissional mas natural. Primeira pessoa quando o transcript é em primeira pessoa.
- Português correto, sem deixar oralidade crua.

ESTRUTURA:
- Se a conversa tem múltiplos blocos lógicos, estruture com seções markdown (### Contexto, ### Decisões, ### Próximos passos).
- Se for curto/único bloco, use um parágrafo direto sem seções.
- Use bullets (-) curtos para listas (decisões, próximos passos, valores acordados).
- **Negrito** apenas em termos-chave (nomes de projetos, valores, datas críticas).

TÍTULO:
- 1 linha, ≤ 80 chars.
- Formato sugerido: "Conversa/Reunião com [Nome] - [assunto principal]" se houver contato.
- Sem aspas, sem emoji.

OUTPUT: chame a tool "polish_note" com { title, content }. Não escreva texto fora.`

  const userParts: string[] = []
  if (ctx.contactName) userParts.push(`CONTATO: ${ctx.contactName}`)
  if (ctx.area) userParts.push(`ÁREA: ${ctx.area}`)
  userParts.push(`\nTRANSCRIÇÃO ORIGINAL:\n"""\n${ctx.transcript}\n"""`)
  userParts.push(
    `\nVERSÃO BRUTA EXTRAÍDA PELO CLASSIFICADOR (use como apoio, mas reescreva):\n"""\n${ctx.draftContent}\n"""`,
  )
  userParts.push(`\nReescreva como nota de reunião bem estruturada.`)

  const res = await ant.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: sys,
    tools: [POLISH_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: "polish_note" },
    messages: [{ role: "user", content: userParts.join("\n") }],
  })

  const toolUse = res.content.find((b) => b.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    // Fallback: devolve o draft original
    return {
      title: "",
      content: ctx.draftContent,
      durationMs: Date.now() - start,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    }
  }

  const input = toolUse.input as { title?: string; content?: string }
  return {
    title: (input.title ?? "").trim().slice(0, 200),
    content: (input.content ?? ctx.draftContent).trim(),
    durationMs: Date.now() - start,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  }
}
