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

const studentSchema = z.object({
  fullName: z.string().min(2, "Nome muito curto"),
  nickname: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  classroom: z.string().optional().nullable(),
  enrollmentId: z.string().optional().nullable(),
  guardian1Name: z.string().optional().nullable(),
  guardian1Phone: z.string().optional().nullable(),
  guardian1Email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
  guardian2Name: z.string().optional().nullable(),
  guardian2Phone: z.string().optional().nullable(),
  guardian2Email: z.string().email().optional().or(z.literal("")).nullable(),
  learningStyle: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  challenges: z.string().optional().nullable(),
  specialNeeds: z.string().optional().nullable(),
  medicalNotes: z.string().optional().nullable(),
})

type StudentInput = z.infer<typeof studentSchema>

export async function listStudentsAction(): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const students = await db.student.findMany({
      where: { userId, isActive: true },
      orderBy: { fullName: "asc" },
    })
    return { success: true, data: students }
  } catch {
    return { success: false, error: "Erro ao listar alunos" }
  }
}

export async function getStudentAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const student = await db.student.findFirst({
      where: { id, userId },
      include: {
        observations: { orderBy: { occurredAt: "desc" }, take: 20 },
        reports: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    })
    if (!student) return { success: false, error: "Aluno não encontrado" }
    return { success: true, data: student }
  } catch {
    return { success: false, error: "Erro ao buscar aluno" }
  }
}

export async function createStudentAction(input: StudentInput): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = studentSchema.parse(input)
    const student = await db.student.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        userId,
      },
    })
    revalidatePath("/alunos")
    return { success: true, data: student }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao criar aluno"
    return { success: false, error: msg || "Erro ao criar aluno" }
  }
}

export async function updateStudentAction(id: string, input: Partial<StudentInput>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = studentSchema.partial().parse(input)
    const student = await db.student.update({
      where: { id, userId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    })
    revalidatePath("/alunos")
    revalidatePath(`/alunos/${id}`)
    return { success: true, data: student }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao atualizar"
    return { success: false, error: msg || "Erro ao atualizar" }
  }
}

export async function archiveStudentAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.student.update({ where: { id, userId }, data: { isActive: false } })
    revalidatePath("/alunos")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao arquivar" }
  }
}

/**
 * IA: gera um resumo pedagógico do aluno a partir do perfil + observações recentes.
 * Demonstra uso de prompt caching (perfil estável) + adaptive thinking.
 */
export async function summarizeStudentAction(id: string): Promise<ActionResult<string>> {
  try {
    const userId = await getUserId()
    const student = await db.student.findFirst({
      where: { id, userId },
      include: { observations: { orderBy: { occurredAt: "desc" }, take: 30 } },
    })
    if (!student) return { success: false, error: "Aluno não encontrado" }

    const { generateText } = await import("@/services/ai.service")

    const systemPrompt = `Você é assistente pedagógico de uma professora de Fundamental I (3ª série).
Seu papel: fazer síntese breve, construtiva e útil sobre um aluno, com base em observações coletadas.
TOM: respeitoso, sem julgamento, focado em aprendizagem e bem-estar.
EXTENSÃO: 4-6 linhas. Nada de platitude.
ESTRUTURA: 1) quem é a criança em 1 frase, 2) o que está indo bem, 3) o que merece atenção, 4) 1 recomendação prática.`

    const userPrompt = `PERFIL DO ALUNO
Nome: ${student.fullName}${student.nickname ? ` ("${student.nickname}")` : ""}
Turma: ${student.classroom ?? "—"}
Estilo de aprendizagem: ${student.learningStyle ?? "não informado"}
Pontos fortes registrados: ${student.strengths ?? "—"}
Dificuldades registradas: ${student.challenges ?? "—"}
Necessidades especiais: ${student.specialNeeds ?? "—"}

OBSERVAÇÕES RECENTES (${student.observations.length}):
${student.observations.map((o) => `[${o.occurredAt.toISOString().slice(0, 10)}] (${o.category}/${o.sentiment}) ${o.title}: ${o.note}`).join("\n")}

Faça a síntese.`

    const summary = await generateText({
      systemPrompt,
      userPrompt,
      action: "summarize_student",
      userId,
      effort: "high",
      maxTokens: 1500,
    })

    return { success: true, data: summary }
  } catch (err) {
    console.error("[summarizeStudentAction]", err)
    return { success: false, error: "Erro ao gerar resumo" }
  }
}
