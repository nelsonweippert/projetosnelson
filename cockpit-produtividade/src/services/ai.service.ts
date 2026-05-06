import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { getTaskStats } from "./task.service"
import { getFinanceSummary, getExpensesByCategory } from "./finance.service"
import { getReferenceStats } from "./reference.service"
import { getAiProvider, type AiProvider } from "@/lib/ai-config"

// ── Model registry + pricing (USD per token, claude-api only) ──────────
const MODELS = {
  "claude-opus-4-7":   { input: 5 / 1_000_000,  output: 25 / 1_000_000 },
  "claude-opus-4-6":   { input: 5 / 1_000_000,  output: 25 / 1_000_000 },
  "claude-sonnet-4-6": { input: 3 / 1_000_000,  output: 15 / 1_000_000 },
  "claude-haiku-4-5":  { input: 1 / 1_000_000,  output: 5 / 1_000_000 },
} as const
type ModelId = keyof typeof MODELS

const REVIEW_MODEL: ModelId = "claude-sonnet-4-6"

let anthropicSingleton: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!anthropicSingleton) {
    anthropicSingleton = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicSingleton
}

// ─── Provider switch ────────────────────────────────────────────────────

interface ChatResult {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
  provider: AiProvider
}

async function chat(
  prompt: string,
  opts: { model?: ModelId; maxTokens?: number } = {},
): Promise<ChatResult> {
  const provider = getAiProvider()
  const model = opts.model ?? REVIEW_MODEL
  const maxTokens = opts.maxTokens ?? 1024

  if (provider === "claude-subscription") {
    return callClaudeSubscription(prompt, model, maxTokens)
  }
  return callClaudeApi(prompt, model, maxTokens)
}

async function callClaudeApi(
  prompt: string,
  model: ModelId,
  maxTokens: number,
): Promise<ChatResult> {
  const start = Date.now()
  const message = await getAnthropic().messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  })
  const durationMs = Date.now() - start
  const block = message.content[0]
  const text = block.type === "text" ? block.text : ""
  return {
    text,
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs,
    provider: "claude-api",
  }
}

/**
 * Chamada via Claude Agent SDK — usa OAuth tokens de `claude login`
 * gravados em `~/.claude/.credentials.json`. Consome da subscription
 * Claude Pro/Max do user (custo 0 por chamada extra).
 *
 * SDK é carregado por dynamic import porque é ESM-only e nosso build
 * pode resolver pra CommonJS em algumas configs.
 */
async function callClaudeSubscription(
  prompt: string,
  model: ModelId,
  maxTokens: number,
): Promise<ChatResult> {
  const start = Date.now()
  let sdk: typeof import("@anthropic-ai/claude-agent-sdk")
  try {
    sdk = await import("@anthropic-ai/claude-agent-sdk")
  } catch (err) {
    throw new Error(
      `Não consegui carregar @anthropic-ai/claude-agent-sdk: ${err instanceof Error ? err.message : "erro desconhecido"}. Rode 'npm install' e tenta de novo.`,
    )
  }

  // SDK aceita string como prompt + opções com model alias ("opus", "sonnet", "haiku")
  // Nossos IDs ("claude-sonnet-4-6") não batem direto — mapear pra alias.
  const alias = modelAlias(model)
  let resultText = ""
  let inputTokens = 0
  let outputTokens = 0
  let resolvedModel: string = model

  try {
    const iterator = sdk.query({
      prompt,
      options: { model: alias, maxThinkingTokens: 0 },
    })

    for await (const message of iterator) {
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "text") {
            resultText += block.text
          }
        }
      }
      if (message.type === "result") {
        if (message.subtype === "success") {
          inputTokens = message.usage?.input_tokens ?? 0
          outputTokens = message.usage?.output_tokens ?? 0
          const usedModel = Object.keys(message.modelUsage ?? {})[0]
          if (usedModel) resolvedModel = usedModel
          break
        }
        throw new Error(
          `Claude Agent SDK retornou erro (${message.subtype}): ${"result" in message ? String(message.result) : "desconhecido"}`,
        )
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro"
    if (
      /not.*authenticat|login required|api key|unauthor|claude login|missing credential/i.test(
        msg,
      )
    ) {
      throw new Error(
        "Provider 'claude-subscription' selecionado mas Claude login não detectado. Rode `claude login` no terminal local OU mude AI_PROVIDER pra 'claude-api'.",
      )
    }
    throw err
  }

  return {
    text: resultText,
    model: resolvedModel,
    inputTokens,
    outputTokens,
    durationMs: Date.now() - start,
    provider: "claude-subscription",
  }
}

function modelAlias(id: ModelId): "opus" | "sonnet" | "haiku" {
  if (id.startsWith("claude-opus")) return "opus"
  if (id.startsWith("claude-haiku")) return "haiku"
  return "sonnet"
}

// ─── Public functions ───────────────────────────────────────────────────

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

  const result = await chat(prompt, { model: REVIEW_MODEL, maxTokens: 16000 })
  if (!result.text) return "Erro ao gerar revisão."

  trackUsage(
    REVIEW_MODEL,
    "weekly_review",
    result.inputTokens,
    result.outputTokens,
    result.durationMs,
    userId,
    result.provider,
  ).catch(() => {})

  await db.aiInsight.create({
    data: { userId, module: "weekly", type: "review", content: result.text },
  })

  return result.text
}

export async function generateModuleInsight(
  userId: string,
  module: "tasks" | "finance" | "studies",
): Promise<string> {
  let contextData = ""
  if (module === "tasks") {
    const stats = await getTaskStats(userId)
    contextData = `Tarefas: ${stats.total} total, ${stats.todo} pendentes, ${stats.inProgress} em andamento, ${stats.done} concluídas`
  } else if (module === "finance") {
    const summary = await getFinanceSummary(userId)
    const byCategory = await getExpensesByCategory(userId)
    contextData = `Financeiro: Receitas R$${summary.totalIncome.toFixed(2)}, Despesas R$${summary.totalExpense.toFixed(2)}, Saldo R$${summary.balance.toFixed(2)}. Top categorias: ${byCategory
      .slice(0, 3)
      .map((c) => `${c.category}: R$${c.amount.toFixed(2)}`)
      .join(", ")}`
  } else if (module === "studies") {
    const stats = await getReferenceStats(userId)
    contextData = `Biblioteca: ${stats.total} itens, ${stats.unread} não lidos, ${stats.read} lidos`
  }

  const prompt = `Você é um assistente de produtividade. Analise estes dados e gere 3 insights acionáveis em português, diretos e práticos. Dados: ${contextData}`

  const result = await chat(prompt, { model: REVIEW_MODEL, maxTokens: 1024 })
  if (!result.text) return "Erro ao gerar insight."

  trackUsage(
    REVIEW_MODEL,
    `module_insight_${module}`,
    result.inputTokens,
    result.outputTokens,
    result.durationMs,
    userId,
    result.provider,
  ).catch(() => {})

  await db.aiInsight.create({
    data: { userId, module, type: "insight", content: result.text },
  })
  return result.text
}

// ─── Usage tracking (model-aware + provider-aware) ──────────────────────

export async function trackUsage(
  model: ModelId,
  action: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  userId?: string,
  provider: AiProvider = "claude-api",
  extra?: Record<string, number>,
) {
  // Subscription = $0 marginal por chamada (paid via subscription mensal).
  // Mantemos tracking de tokens pra observabilidade, mas costUsd=0.
  const pricing = MODELS[model] ?? MODELS["claude-sonnet-4-6"]
  const costUsd =
    provider === "claude-subscription"
      ? 0
      : inputTokens * pricing.input + outputTokens * pricing.output
  try {
    const uid = userId || (await db.user.findFirst({ select: { id: true } }))?.id
    if (!uid) return
    const extraSuffix = extra ? ` ${JSON.stringify(extra)}` : ""
    const actionTag =
      provider === "claude-subscription" ? `${action} [sub]` : action
    await db.apiUsage.create({
      data: {
        userId: uid,
        model,
        action: actionTag + extraSuffix,
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
