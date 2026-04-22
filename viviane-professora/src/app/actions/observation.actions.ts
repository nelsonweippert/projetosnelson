"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

const schema = z.object({
  studentId: z.string().min(1, "Selecione o aluno"),
  category: z.enum(["BEHAVIOR", "ACADEMIC", "SOCIAL", "EMOTIONAL", "HEALTH", "PARTICIPATION", "OTHER"]),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "CONCERN", "URGENT"]).default("NEUTRAL"),
  title: z.string().min(2, "Título muito curto"),
  note: z.string().min(3, "Observação muito curta"),
  subject: z.string().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
})

type Input = z.infer<typeof schema>

export async function createObservationAction(input: Input): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = schema.parse(input)

    // IA: gera tags + resumo automaticamente (fire-and-forget wouldn't work with tx, so await)
    let aiSummary: string | null = null
    let aiTags: string[] = []
    try {
      const { generateStructured } = await import("@/services/ai.service")
      const TagSchema = z.object({
        summary: z.string().describe("Resumo em 1 frase da observação, didático"),
        tags: z.array(z.string()).describe("3-6 tags temáticas em PT-BR, lowercase, kebab-case (ex: leitura-em-voz-alta)"),
      })
      const result = await generateStructured({
        schema: TagSchema,
        systemPrompt: "Você é assistente pedagógico. Para cada observação sobre um aluno do Fundamental I, gere um resumo curto + tags.",
        userPrompt: `Categoria: ${data.category}\nSentimento: ${data.sentiment}\nTítulo: ${data.title}\nObservação: ${data.note}${data.subject ? `\nMatéria: ${data.subject}` : ""}`,
        action: "observation_enrich",
        userId,
        effort: "low",
        maxTokens: 600,
      })
      aiSummary = result.summary
      aiTags = result.tags
    } catch (err) {
      console.warn("[observation IA enrich] failed, continuing without:", err)
    }

    const obs = await db.observation.create({
      data: {
        ...data,
        subject: data.subject || null,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        aiSummary,
        aiTags,
        userId,
      },
    })

    revalidatePath("/observacoes")
    revalidatePath(`/alunos/${data.studentId}`)
    return { success: true, data: obs }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao criar observação"
    return { success: false, error: msg || "Erro" }
  }
}

export async function deleteObservationAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const obs = await db.observation.findFirst({ where: { id, userId } })
    if (!obs) return { success: false, error: "Não encontrado" }
    await db.observation.delete({ where: { id } })
    revalidatePath("/observacoes")
    revalidatePath(`/alunos/${obs.studentId}`)
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
