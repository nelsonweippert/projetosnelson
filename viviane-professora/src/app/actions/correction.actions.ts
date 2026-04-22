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

const analyzeSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2),
  subject: z.string().min(1),
  activityType: z.string().optional(),
  rubric: z.string().optional(),
  imageBase64: z.string().min(10),
  imageMime: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
})

export async function analyzeCorrectionAction(input: z.infer<typeof analyzeSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = analyzeSchema.parse(input)

    const student = await db.student.findFirst({ where: { id: data.studentId, userId } })
    if (!student) return { success: false, error: "Aluno não encontrado" }

    const { analyzeImage, generateStructured, CorrectionSchema } = await import("@/services/ai.service")

    // 1) Transcrição bruta da imagem — Vision descreve o que vê no caderno
    const transcript = await analyzeImage({
      imageBase64: { data: data.imageBase64, mediaType: data.imageMime },
      systemPrompt: "Você é uma professora experiente do Fundamental I. Transcreva exatamente o que vê na foto do caderno/atividade do aluno. Se houver desenhos, descreva. Se houver erros ortográficos, transcreva como estão (sem corrigir).",
      userPrompt: `Matéria: ${data.subject}${data.activityType ? `\nTipo: ${data.activityType}` : ""}\n\nTranscreva o conteúdo da imagem.`,
      userId,
      action: "correction_vision_transcribe",
      maxTokens: 2000,
    })

    // 2) Correção estruturada — agora com o texto transcrito + perfil do aluno
    const correction = await generateStructured({
      schema: CorrectionSchema,
      systemPrompt: `Você é uma professora especialista em Ensino Fundamental I (3ª série, ~8-9 anos).
Avalie o trabalho do aluno com olhar construtivo, em português claro e empático.
REGRAS:
- Feedback em tom APROPRIADO PARA CRIANÇA (sem jargão, acolhedor, específico).
- Pontos fortes SEMPRE concretos (não genéricos).
- Melhorias com sugestão prática (o que fazer diferente).
- Alinhamento BNCC: cite códigos aplicáveis (ex: EF03LP01).
- Nota/conceito: use o sistema de conceitos do Fundamental I (A/B/C ou Satisfatório/Parcial/Não Atingido) — a menos que a rubrica diga outra coisa.`,
      userPrompt: `ALUNO: ${student.fullName}${student.nickname ? ` ("${student.nickname}")` : ""}
PERFIL: ${student.strengths ? `Pontos fortes: ${student.strengths}. ` : ""}${student.challenges ? `Dificuldades: ${student.challenges}. ` : ""}${student.specialNeeds ? `Necessidades: ${student.specialNeeds}.` : ""}

ATIVIDADE: ${data.title}
MATÉRIA: ${data.subject}${data.activityType ? `\nTIPO: ${data.activityType}` : ""}
${data.rubric ? `\nRUBRICA:\n${data.rubric}` : ""}

TRANSCRIÇÃO DO TRABALHO DO ALUNO (do Vision):
${transcript}

Faça a correção estruturada.`,
      action: "correction_evaluate",
      userId,
      effort: "high",
      maxTokens: 2500,
    })

    return { success: true, data: { transcript, correction } }
  } catch (err) {
    console.error("[analyzeCorrection]", err)
    const msg = err instanceof Error ? err.message : "Erro na correção"
    return { success: false, error: msg }
  }
}

const saveSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2),
  subject: z.string().min(1),
  activityType: z.string().optional().nullable(),
  rubric: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  feedback: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  improvements: z.string().optional().nullable(),
  aiSuggestion: z.string().optional().nullable(),
  generatedBy: z.string().optional().nullable(),
  status: z.enum(["PENDING", "IN_REVIEW", "DONE", "RETURNED"]).default("IN_REVIEW"),
})

export async function saveCorrectionAction(input: z.infer<typeof saveSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = saveSchema.parse(input)
    const c = await db.correction.create({ data: { ...data, userId } })
    revalidatePath("/correcoes")
    return { success: true, data: c }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao salvar"
    return { success: false, error: msg || "Erro" }
  }
}
