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

const score = z.number().int().min(1).max(5)

const schema = z.object({
  studentId: z.string().min(1),
  referenceMonth: z.string().min(7),
  label: z.string().optional().nullable(),
  alimentacao: score,
  comportamento: score,
  relacoesInterpessoais: score,
  participacao: score,
  autonomia: score,
  aprendizagem: score,
  emocional: score,
  higiene: score,
  alimentacaoNote: z.string().optional().nullable(),
  comportamentoNote: z.string().optional().nullable(),
  relacoesInterpessoaisNote: z.string().optional().nullable(),
  participacaoNote: z.string().optional().nullable(),
  autonomiaNote: z.string().optional().nullable(),
  aprendizagemNote: z.string().optional().nullable(),
  emocionalNote: z.string().optional().nullable(),
  higieneNote: z.string().optional().nullable(),
  overallNotes: z.string().optional().nullable(),
  nextSteps: z.string().optional().nullable(),
})

function firstOfMonth(yyyyMm: string): Date {
  // aceita "2026-03" ou "2026-03-15"
  const [y, m] = yyyyMm.split("-")
  return new Date(parseInt(y), parseInt(m) - 1, 1)
}

export async function upsertAssessmentAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = schema.parse(input)
    const month = firstOfMonth(data.referenceMonth)

    const existing = await db.monthlyAssessment.findUnique({
      where: { studentId_referenceMonth: { studentId: data.studentId, referenceMonth: month } },
    })

    const payload = { ...data, referenceMonth: month, userId }
    const assessment = existing
      ? await db.monthlyAssessment.update({ where: { id: existing.id }, data: payload })
      : await db.monthlyAssessment.create({ data: payload })

    revalidatePath("/avaliacoes")
    revalidatePath(`/alunos/${data.studentId}`)
    return { success: true, data: assessment }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao salvar"
    return { success: false, error: msg || "Erro" }
  }
}

export async function deleteAssessmentAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const a = await db.monthlyAssessment.findFirst({ where: { id, userId } })
    if (!a) return { success: false, error: "Não encontrado" }
    await db.monthlyAssessment.delete({ where: { id } })
    revalidatePath("/avaliacoes")
    revalidatePath(`/alunos/${a.studentId}`)
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
