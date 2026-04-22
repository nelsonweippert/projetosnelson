import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { getTaskStats } from "./task.service"
import { getFinanceSummary, getExpensesByCategory } from "./finance.service"
import { getReferenceStats } from "./reference.service"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Model registry + pricing (USD per token) ───────────────────────────
const MODELS = {
  "claude-opus-4-7":   { input: 5 / 1_000_000,  output: 25 / 1_000_000 },
  "claude-opus-4-6":   { input: 5 / 1_000_000,  output: 25 / 1_000_000 },
  "claude-sonnet-4-6": { input: 3 / 1_000_000,  output: 15 / 1_000_000 },
  "claude-haiku-4-5":  { input: 1 / 1_000_000,  output: 5 / 1_000_000 },
} as const
type ModelId = keyof typeof MODELS

const REVIEW_MODEL: ModelId = "claude-sonnet-4-6"

export async function generateWeeklyReview(userId: string): Promise<string> {
  const [taskStats, finance, refStats] = await Promise.all([
    getTaskStats(userId),
    getFinanceSummary(userId),
    getReferenceStats(userId),
  ])

  const prompt = `Você é um assistente de produtividade pessoal. Analise os dados abaixo e gere uma revisão semanal em português, clara, direta e motivadora. Use markdown leve.

DADOS DA SEMANA:

Tarefas:
- Total: ${taskStats.total} | A fazer: ${taskStats.todo} | Em andamento: ${taskStats.inProgress} | Concluídas: ${taskStats.done}

Financeiro (mês atual):
- Receitas: R$ ${finance.totalIncome.toFixed(2)} | Despesas: R$ ${finance.totalExpense.toFixed(2)} | Saldo: R$ ${finance.balance.toFixed(2)} | Taxa de poupança: ${finance.savingsRate.toFixed(1)}%

Biblioteca de Estudos:
- Total: ${refStats.total} | Não lido: ${refStats.unread} | Lendo: ${refStats.reading} | Lido: ${refStats.read}

Gere:
1. Um resumo executivo em 2-3 linhas
2. Destaques positivos (o que foi bem)
3. Pontos de atenção (o que precisa de foco)
4. 3 prioridades recomendadas para a próxima semana`

  const start = Date.now()
  const message = await anthropic.messages.create({
    model: REVIEW_MODEL,
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  })
  const durationMs = Date.now() - start
  const content = message.content[0]
  if (content.type !== "text") return "Erro ao gerar revisão."

  trackUsage(REVIEW_MODEL, "weekly_review", message.usage.input_tokens, message.usage.output_tokens, durationMs, userId).catch(() => {})

  await db.aiInsight.create({
    data: { userId, module: "weekly", type: "review", content: content.text },
  })

  return content.text
}

export async function generateModuleInsight(userId: string, module: "tasks" | "finance" | "studies"): Promise<string> {
  let contextData = ""
  if (module === "tasks") {
    const stats = await getTaskStats(userId)
    contextData = `Tarefas: ${stats.total} total, ${stats.todo} pendentes, ${stats.inProgress} em andamento, ${stats.done} concluídas`
  } else if (module === "finance") {
    const summary = await getFinanceSummary(userId)
    const byCategory = await getExpensesByCategory(userId)
    contextData = `Financeiro: Receitas R$${summary.totalIncome.toFixed(2)}, Despesas R$${summary.totalExpense.toFixed(2)}, Saldo R$${summary.balance.toFixed(2)}. Top categorias: ${byCategory.slice(0,3).map(c => `${c.category}: R$${c.amount.toFixed(2)}`).join(", ")}`
  } else if (module === "studies") {
    const stats = await getReferenceStats(userId)
    contextData = `Biblioteca: ${stats.total} itens, ${stats.unread} não lidos, ${stats.read} lidos`
  }

  const start = Date.now()
  const message = await anthropic.messages.create({
    model: REVIEW_MODEL,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Você é um assistente de produtividade. Analise estes dados e gere 3 insights acionáveis em português, diretos e práticos. Dados: ${contextData}`,
    }],
  })
  const durationMs = Date.now() - start
  const content = message.content[0]
  if (content.type !== "text") return "Erro ao gerar insight."

  trackUsage(REVIEW_MODEL, `module_insight_${module}`, message.usage.input_tokens, message.usage.output_tokens, durationMs, userId).catch(() => {})

  await db.aiInsight.create({
    data: { userId, module, type: "insight", content: content.text },
  })
  return content.text
}

// ── Usage tracking (model-aware) ──────────────────────────────────────

export async function trackUsage(
  model: ModelId,
  action: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  userId?: string,
  extra?: Record<string, number>,
) {
  const pricing = MODELS[model] ?? MODELS["claude-sonnet-4-6"]
  const costUsd = inputTokens * pricing.input + outputTokens * pricing.output
  try {
    const uid = userId || (await db.user.findFirst({ select: { id: true } }))?.id
    if (!uid) return
    const extraSuffix = extra ? ` ${JSON.stringify(extra)}` : ""
    await db.apiUsage.create({
      data: {
        userId: uid,
        model,
        action: action + extraSuffix,
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
      },
    })
  } catch {}
}

export async function getAiInsights(userId: string) {
  return db.aiInsight.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
}

export async function reactToInsight(id: string, reaction: string) {
  return db.aiInsight.update({ where: { id }, data: { reaction } })
}
