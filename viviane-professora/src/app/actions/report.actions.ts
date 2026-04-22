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
  studentId: z.string().min(1),
  period: z.enum(["BIMESTER_1", "BIMESTER_2", "BIMESTER_3", "BIMESTER_4", "SEMESTER_1", "SEMESTER_2", "ANNUAL", "CUSTOM"]),
  periodLabel: z.string().min(1),
  fromDate: z.string().optional().nullable(),
  toDate: z.string().optional().nullable(),
})

const PERIOD_RANGES: Record<string, [number, number]> = {
  // [mês início (0-11), mês fim]
  BIMESTER_1: [1, 3],   // fev-abr
  BIMESTER_2: [3, 5],   // abr-jun
  BIMESTER_3: [6, 8],   // jul-set
  BIMESTER_4: [8, 11],  // set-dez
  SEMESTER_1: [1, 5],
  SEMESTER_2: [6, 11],
  ANNUAL: [0, 11],
}

export async function generateReportAction(input: z.infer<typeof genSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = genSchema.parse(input)

    const student = await db.student.findFirst({ where: { id: data.studentId, userId } })
    if (!student) return { success: false, error: "Aluno não encontrado" }

    // Determinar janela
    let fromDate: Date, toDate: Date
    if (data.fromDate && data.toDate) {
      fromDate = new Date(data.fromDate)
      toDate = new Date(data.toDate)
    } else if (data.period !== "CUSTOM" && PERIOD_RANGES[data.period]) {
      const [m1, m2] = PERIOD_RANGES[data.period]
      const year = new Date().getFullYear()
      fromDate = new Date(year, m1, 1)
      toDate = new Date(year, m2 + 1, 0) // último dia do mês fim
    } else {
      return { success: false, error: "Informe datas pro período CUSTOM." }
    }

    const observations = await db.observation.findMany({
      where: {
        userId,
        studentId: data.studentId,
        occurredAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { occurredAt: "asc" },
    })

    if (observations.length === 0) {
      return { success: false, error: `Nenhuma observação encontrada para ${student.fullName} entre ${fromDate.toLocaleDateString("pt-BR")} e ${toDate.toLocaleDateString("pt-BR")}. Registre observações primeiro.` }
    }

    const { generateStructured, DescriptiveReportSchema } = await import("@/services/ai.service")

    const sections = await generateStructured({
      schema: DescriptiveReportSchema,
      systemPrompt: `Você é uma professora de Fundamental I (Colégio Porto Seguro — Portinho) escrevendo relatório descritivo bimestral.
VOZ: primeira pessoa do plural (nós) ou impessoal. NUNCA primeira pessoa do singular.
EXTENSÃO: cada seção de 3 a 6 linhas. Específica, baseada em observações reais citadas.
TOM: acolhedor, respeitoso, construtivo, sem rotular a criança.
EVITAR: platitudes ("é um ótimo aluno"), julgamentos morais, comparações com colegas.
ESTRUTURA: cada seção deve mencionar PELO MENOS um fato específico observado (sem datas).
CONCLUSÃO: deve ter recomendações práticas para os responsáveis + próximos passos pedagógicos.`,
      userPrompt: `ALUNO: ${student.fullName}${student.nickname ? ` ("${student.nickname}")` : ""}
TURMA: ${student.classroom ?? "—"}
PERFIL:
${student.strengths ? `- Pontos fortes: ${student.strengths}` : ""}
${student.challenges ? `- Desafios: ${student.challenges}` : ""}
${student.specialNeeds ? `- Necessidades: ${student.specialNeeds}` : ""}
${student.learningStyle ? `- Estilo de aprendizagem: ${student.learningStyle}` : ""}

PERÍODO: ${data.periodLabel}
JANELA: ${fromDate.toLocaleDateString("pt-BR")} a ${toDate.toLocaleDateString("pt-BR")}

OBSERVAÇÕES COLETADAS (${observations.length}):
${observations.map((o) => `[${o.occurredAt.toISOString().slice(0, 10)}] ${o.category}/${o.sentiment}${o.subject ? ` (${o.subject})` : ""} — ${o.title}: ${o.note}${o.aiSummary ? ` | Resumo IA: ${o.aiSummary}` : ""}${o.aiTags?.length ? ` | Tags: ${o.aiTags.join(", ")}` : ""}`).join("\n")}

Escreva o relatório completo em 10 seções.`,
      action: "report_generate",
      userId,
      effort: "high",
      maxTokens: 8000,
    })

    const report = await db.report.create({
      data: {
        userId,
        studentId: data.studentId,
        period: data.period,
        periodLabel: data.periodLabel,
        status: "DRAFT",
        ...sections,
        sourcedFromObsIds: observations.map((o) => o.id),
        generatedBy: "ai",
      },
    })

    revalidatePath("/relatorios")
    return { success: true, data: report }
  } catch (err) {
    console.error("[generateReport]", err)
    const msg = err instanceof Error ? err.message : "Erro ao gerar relatório"
    return { success: false, error: msg }
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  socioEmotional: z.string().optional(),
  academic: z.string().optional(),
  language: z.string().optional(),
  math: z.string().optional(),
  science: z.string().optional(),
  socialStudies: z.string().optional(),
  arts: z.string().optional(),
  physicalEd: z.string().optional(),
  participation: z.string().optional(),
  conclusion: z.string().optional(),
  status: z.enum(["DRAFT", "REVIEWED", "FINAL"]).optional(),
})

export async function updateReportAction(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const { id, ...rest } = updateSchema.parse(input)
    const r = await db.report.update({
      where: { id, userId },
      data: { ...rest, generatedBy: "ai_edited" },
    })
    revalidatePath("/relatorios")
    revalidatePath(`/relatorios/${id}`)
    return { success: true, data: r }
  } catch {
    return { success: false, error: "Erro ao atualizar" }
  }
}

export async function deleteReportAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.report.delete({ where: { id, userId } })
    revalidatePath("/relatorios")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
