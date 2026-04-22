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
  referenceWeek: z.string().min(7), // YYYY-MM-DD (qualquer dia — viramos pra segunda)
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
  highlight: z.string().optional().nullable(),
  concerns: z.string().optional().nullable(),
})

// Converte qualquer data pra segunda-feira da mesma semana (ISO week)
function toMondayOfWeek(date: string): Date {
  const d = new Date(date)
  const dow = d.getDay() // 0 (dom) ... 6 (sab)
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function upsertWeeklyAssessmentAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = schema.parse(input)
    const week = toMondayOfWeek(data.referenceWeek)

    const existing = await db.weeklyAssessment.findUnique({
      where: { studentId_referenceWeek: { studentId: data.studentId, referenceWeek: week } },
    })
    const payload = { ...data, referenceWeek: week, userId }
    const saved = existing
      ? await db.weeklyAssessment.update({ where: { id: existing.id }, data: payload })
      : await db.weeklyAssessment.create({ data: payload })

    revalidatePath("/avaliacoes")
    revalidatePath(`/alunos/${data.studentId}`)
    return { success: true, data: saved }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao salvar"
    return { success: false, error: msg || "Erro" }
  }
}

export async function deleteWeeklyAssessmentAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const a = await db.weeklyAssessment.findFirst({ where: { id, userId } })
    if (!a) return { success: false, error: "Não encontrado" }
    await db.weeklyAssessment.delete({ where: { id } })
    revalidatePath("/avaliacoes")
    revalidatePath(`/alunos/${a.studentId}`)
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
