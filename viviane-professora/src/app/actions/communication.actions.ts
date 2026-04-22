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

const draftSchema = z.object({
  studentId: z.string().optional().nullable(),
  type: z.enum(["NOTE", "EMAIL", "WHATSAPP", "MEETING", "PHONE_CALL", "OTHER"]),
  tone: z.enum(["FORMAL", "EMPATICO", "INFORMATIVO", "ALERTA"]).default("EMPATICO"),
  context: z.string().min(5, "Descreva o contexto"),
})

export async function draftCommunicationAction(input: z.infer<typeof draftSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = draftSchema.parse(input)

    let studentContext = ""
    if (data.studentId) {
      const student = await db.student.findFirst({
        where: { id: data.studentId, userId },
        include: { observations: { orderBy: { occurredAt: "desc" }, take: 5 } },
      })
      if (student) {
        studentContext = `
ALUNO: ${student.fullName}${student.nickname ? ` ("${student.nickname}")` : ""}
Turma: ${student.classroom ?? "—"}
${student.strengths ? `Pontos fortes: ${student.strengths}` : ""}
${student.challenges ? `Dificuldades: ${student.challenges}` : ""}
${student.specialNeeds ? `Necessidades: ${student.specialNeeds}` : ""}

RESPONSÁVEL 1: ${student.guardian1Name ?? "—"}
RESPONSÁVEL 2: ${student.guardian2Name ?? "—"}

Últimas observações:
${student.observations.map((o) => `- [${o.occurredAt.toISOString().slice(0, 10)}] ${o.title}: ${o.note}`).join("\n")}`
      }
    }

    const { generateStructured, CommunicationDraftSchema } = await import("@/services/ai.service")
    const toneDescription = {
      FORMAL: "Formal — linguagem polida, respeitosa, estrutura profissional",
      EMPATICO: "Empático — acolhedor, valoriza o trabalho da família, foca em parceria",
      INFORMATIVO: "Informativo — direto, claro, foca em fatos e próximos passos",
      ALERTA: "Alerta — preocupação clara mas sem alarmismo, convida ao diálogo",
    }[data.tone]

    const draft = await generateStructured({
      schema: CommunicationDraftSchema,
      systemPrompt: `Você é uma professora experiente do Fundamental I escrevendo para os responsáveis de um aluno.
REGRAS:
- Português do Brasil, impecável.
- Tom: ${toneDescription}.
- Nunca use jargão pedagógico sem explicar.
- Se for alerta ou atenção, ENQUADRE positivamente (parceria, não acusação).
- CallToAction explícito quando apropriado (ex: "pedimos confirmação", "aguardamos retorno até...").
- Assinatura implícita (não assine — quem assina é a professora).
- TIPO DA COMUNICAÇÃO: ${data.type} — adapte o formato ao canal.`,
      userPrompt: `${studentContext}\n\nCONTEXTO DA MENSAGEM:\n${data.context}\n\nEscreva o rascunho.`,
      action: "communication_draft",
      userId,
      effort: "medium",
      maxTokens: 2000,
    })

    return { success: true, data: draft }
  } catch (err) {
    console.error("[draftCommunication]", err)
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : err instanceof Error ? err.message : "Erro ao gerar rascunho"
    return { success: false, error: msg }
  }
}

const saveSchema = z.object({
  studentId: z.string().optional().nullable(),
  type: z.enum(["NOTE", "EMAIL", "WHATSAPP", "MEETING", "PHONE_CALL", "OTHER"]),
  subject: z.string().min(2),
  body: z.string().min(5),
  toName: z.string().optional().nullable(),
  toContact: z.string().optional().nullable(),
  tone: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "ANSWERED", "FOLLOWUP_NEEDED"]).default("DRAFT"),
  generatedBy: z.string().optional().nullable(),
})

export async function saveCommunicationAction(input: z.infer<typeof saveSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = saveSchema.parse(input)
    const c = await db.communication.create({
      data: {
        ...data,
        sentAt: data.status === "SENT" ? new Date() : null,
        userId,
      },
    })
    revalidatePath("/comunicacao")
    return { success: true, data: c }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao salvar"
    return { success: false, error: msg || "Erro" }
  }
}
