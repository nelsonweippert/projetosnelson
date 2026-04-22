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
  type: z.enum(["EXERCISE", "ASSESSMENT", "PROJECT", "GAME", "READING", "WRITING", "OTHER"]).default("EXERCISE"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  count: z.number().int().min(1).max(30).default(5),
  title: z.string().min(2),
})

export async function generateActivityAction(input: z.infer<typeof genSchema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = genSchema.parse(input)

    const { generateStructured, ActivityItemsSchema } = await import("@/services/ai.service")

    const act = await generateStructured({
      schema: ActivityItemsSchema,
      systemPrompt: `Você é especialista em criação de atividades para Ensino Fundamental I (3ª série).
REGRAS:
- Enunciados curtos, diretos, linguagem clara para criança de 8-9 anos.
- Variedade de tipos de questão (múltipla escolha, aberta, V/F, correspondência, lacuna, desenho) dentro da mesma atividade.
- Dificuldade adequada: EASY = revisão, MEDIUM = aplicação, HARD = transferência/análise.
- Para questões abertas: dar pelo menos 1 linha de sugestão de resposta.
- Dica didática: UMA dica útil por questão (sem dar a resposta).
- Alinhamento com BNCC (cite códigos reais, ex: EF03LP01).
- Estimar tempo realista (3ª série: leitura lenta, escrita manual).`,
      userPrompt: `MATÉRIA: ${data.subject}
TÓPICO: ${data.topic}
TIPO: ${data.type}
DIFICULDADE: ${data.difficulty}
QUANTIDADE DE QUESTÕES: ${data.count}

Gere a atividade completa com ${data.count} questões variadas, cada uma com gabarito e dica.`,
      action: "activity_generate",
      userId,
      effort: "high",
      maxTokens: 6000,
    })

    const created = await db.activity.create({
      data: {
        userId,
        title: data.title,
        type: data.type,
        subject: data.subject,
        difficulty: data.difficulty,
        instructions: act.instructions,
        items: act.items,
        bnccCodes: act.bnccCodes,
        estimatedMin: act.estimatedMin,
        generatedBy: "ai",
      },
    })

    revalidatePath("/atividades")
    return { success: true, data: created }
  } catch (err) {
    console.error("[generateActivity]", err)
    const msg = err instanceof Error ? err.message : "Erro ao gerar atividade"
    return { success: false, error: msg }
  }
}

export async function deleteActivityAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.activity.delete({ where: { id, userId } })
    revalidatePath("/atividades")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
