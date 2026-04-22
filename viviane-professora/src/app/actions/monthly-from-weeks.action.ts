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
  studentId: z.string().min(1),
  referenceMonth: z.string().min(7), // "YYYY-MM"
})

export async function generateMonthlyFromWeeksAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const { studentId, referenceMonth } = schema.parse(input)

    const [y, m] = referenceMonth.split("-").map((n) => parseInt(n, 10))
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 0, 23, 59, 59)

    const student = await db.student.findFirst({ where: { id: studentId, userId } })
    if (!student) return { success: false, error: "Aluno não encontrado" }

    const weeks = await db.weeklyAssessment.findMany({
      where: { userId, studentId, referenceWeek: { gte: monthStart, lte: monthEnd } },
      orderBy: { referenceWeek: "asc" },
    })
    if (weeks.length === 0) {
      return { success: false, error: "Nenhuma avaliação semanal encontrada neste mês. Registre as semanais primeiro." }
    }

    const observations = await db.observation.findMany({
      where: { userId, studentId, occurredAt: { gte: monthStart, lte: monthEnd } },
      orderBy: { occurredAt: "asc" },
    })

    const { generateStructured } = await import("@/services/ai.service")

    const score = z.number().int().min(1).max(5)
    const Schema = z.object({
      alimentacao: score,
      comportamento: score,
      relacoesInterpessoais: score,
      participacao: score,
      autonomia: score,
      aprendizagem: score,
      emocional: score,
      higiene: score,
      alimentacaoNote: z.string(),
      comportamentoNote: z.string(),
      relacoesInterpessoaisNote: z.string(),
      participacaoNote: z.string(),
      autonomiaNote: z.string(),
      aprendizagemNote: z.string(),
      emocionalNote: z.string(),
      higieneNote: z.string(),
      overallNotes: z.string().describe("Síntese geral do mês em 5-8 linhas. Tom acolhedor e específico. Mencione evolução observada nas semanas."),
      nextSteps: z.string().describe("3-4 ações práticas pra o próximo mês, baseadas no que foi observado."),
    })

    const weekSummary = weeks.map((w) => {
      const d = w.referenceWeek.toISOString().slice(0, 10)
      return `Semana ${d}:
  Alimentação ${w.alimentacao}, Comportamento ${w.comportamento}, Relações ${w.relacoesInterpessoais}, Participação ${w.participacao}, Autonomia ${w.autonomia}, Aprendizagem ${w.aprendizagem}, Emocional ${w.emocional}, Higiene ${w.higiene}
  ${w.highlight ? `Destaque: ${w.highlight}` : ""}
  ${w.concerns ? `Preocupação: ${w.concerns}` : ""}`
    }).join("\n\n")

    const obsSummary = observations.length > 0
      ? observations.map((o) => `[${o.occurredAt.toISOString().slice(0, 10)}] ${o.category}/${o.sentiment} — ${o.title}: ${o.note}`).join("\n")
      : "(sem observações adicionais neste mês)"

    const monthName = monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

    const result = await generateStructured({
      schema: Schema,
      systemPrompt: `Você é uma professora experiente do Fundamental I (Colégio Porto Seguro — Portinho) consolidando o mês pra reunião pedagógica.
Você recebe ${weeks.length} avaliações semanais + observações diárias e produz a AVALIAÇÃO MENSAL CONSOLIDADA.

REGRAS:
- Scores mensais: NÃO é só a média. Pondere progressão (última semana vale mais se houve tendência), consistência (queda brusca = score menor), e confirme com observações.
- Notas por eixo: 1 frase específica citando pelo menos 1 fato observado nas semanas/observações.
- overallNotes: identifique o ARCO do mês — onde começou, onde terminou, o que causou a mudança (se houve).
- nextSteps: ações concretas, não platitudes.
- VOZ: impessoal ou "nós". Nunca "eu".
- Se as semanas mostram REGRESSÃO, diga honestamente (com empatia).`,
      userPrompt: `ALUNO: ${student.fullName}${student.nickname ? ` ("${student.nickname}")` : ""}
PERFIL: ${student.strengths ? `Fortes: ${student.strengths}. ` : ""}${student.challenges ? `Desafios: ${student.challenges}. ` : ""}${student.specialNeeds ? `Necessidades: ${student.specialNeeds}.` : ""}

MÊS: ${monthName}

${weeks.length} AVALIAÇÕES SEMANAIS:
${weekSummary}

OBSERVAÇÕES DO MÊS (${observations.length}):
${obsSummary}

Consolide em uma avaliação mensal.`,
      action: "monthly_from_weeks",
      userId,
      effort: "high",
      maxTokens: 4000,
    })

    const existing = await db.monthlyAssessment.findUnique({
      where: { studentId_referenceMonth: { studentId, referenceMonth: monthStart } },
    })

    const data = {
      ...result,
      studentId,
      userId,
      referenceMonth: monthStart,
      label: `Consolidação IA — ${monthName}`,
      sourcedFromWeekIds: weeks.map((w) => w.id),
      sourcedFromObsIds: observations.map((o) => o.id),
      generatedBy: "ai",
    }

    const saved = existing
      ? await db.monthlyAssessment.update({ where: { id: existing.id }, data })
      : await db.monthlyAssessment.create({ data })

    revalidatePath("/avaliacoes")
    revalidatePath(`/avaliacoes/${saved.id}`)
    revalidatePath(`/alunos/${studentId}`)

    return { success: true, data: { id: saved.id, weeksUsed: weeks.length, observationsUsed: observations.length } }
  } catch (err) {
    console.error("[generateMonthlyFromWeeks]", err)
    const msg = err instanceof Error ? err.message : "Erro na consolidação"
    return { success: false, error: msg }
  }
}
