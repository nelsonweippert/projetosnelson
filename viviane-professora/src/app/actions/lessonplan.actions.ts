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

const genSchema = z.object({
  subject: z.string().min(2),
  topic: z.string().min(2),
  duration: z.number().int().min(10).max(240),
  date: z.string(),
  objectives: z.string().optional().nullable(),
  useWebSearch: z.boolean().default(true),
})

export async function generateLessonPlanAction(input: z.infer<typeof genSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = genSchema.parse(input)

    const { generateStructured, LessonPlanSchema } = await import("@/services/ai.service")

    const plan = await generateStructured({
      schema: LessonPlanSchema,
      systemPrompt: `Você é especialista em didática do Ensino Fundamental I, conhecedora profunda da BNCC brasileira.
REGRAS:
- Todo plano deve citar códigos BNCC reais e aplicáveis (não invente códigos).
- Se usar web_search, busque o texto oficial da BNCC (basenacionalcomum.mec.gov.br) e cite a URL.
- Objetivos de aprendizagem devem ser específicos, observáveis e mensuráveis.
- Metodologia adequada à faixa etária (3ª série ≈ 8-9 anos): concreto > abstrato, lúdico importa, atenção sustentada 15-20 min.
- Cada aula precisa de: abertura (hook), desenvolvimento, fechamento (sistematização).
- Avaliação formativa (não só prova) — observação, produção, participação.
- Adaptações: sempre pensar em 1 aluno com dificuldade + 1 com altas habilidades.
- Materials: listar só o necessário, realista.

Se useWebSearch estiver ativo, pesquise primeiro a BNCC e estratégias didáticas atualizadas, depois componha.`,
      userPrompt: `MATÉRIA: ${data.subject}
TEMA/ASSUNTO: ${data.topic}
DURAÇÃO: ${data.duration} min
DATA: ${data.date}
${data.objectives ? `\nOBJETIVOS PRÉVIOS DA PROFESSORA:\n${data.objectives}` : ""}

Gere o plano de aula completo. Cite códigos BNCC com URL quando possível.`,
      action: "lesson_plan_generate",
      userId,
      effort: "high",
      maxTokens: 6000,
      useWebSearch: data.useWebSearch,
      useWebFetch: data.useWebSearch,
    })

    const created = await db.lessonPlan.create({
      data: {
        userId,
        title: plan.title,
        subject: plan.subject,
        date: new Date(data.date),
        duration: plan.duration,
        bnccCodes: plan.bnccCodes,
        objectives: plan.objectives,
        skills: plan.skills,
        content: plan.content,
        methodology: plan.methodology,
        materials: plan.materials,
        activities: plan.activities,
        assessment: plan.assessment,
        homework: plan.homework,
        adaptations: plan.adaptations,
        citations: plan.citations,
        generatedBy: "ai",
        status: "PLANNED",
      },
    })

    revalidatePath("/planos-aula")
    return { success: true, data: created }
  } catch (err) {
    console.error("[generateLessonPlan]", err)
    const msg = err instanceof Error ? err.message : "Erro ao gerar plano"
    return { success: false, error: msg }
  }
}

export async function deleteLessonPlanAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.lessonPlan.delete({ where: { id, userId } })
    revalidatePath("/planos-aula")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
