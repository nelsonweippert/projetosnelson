#!/usr/bin/env tsx
/**
 * Worker Captura — entry point (TypeScript / tsx).
 *
 * Loop:
 *   1. getUpdates(offset) — long-polling 30s
 *   2. Filtra por TELEGRAM_OWNER_CHAT_ID (segurança)
 *   3. Idempotency via update_id
 *   4. Voice → Whisper → texto
 *   5. Texto → Claude Haiku → CapturedItem
 *   6. Persist via Prisma direto (single-user trusted)
 *   7. Reply confirmação
 */

import "dotenv/config"
import { config as loadDotenv } from "dotenv"
import { resolve } from "node:path"

// Carrega .env.local da raiz do projeto cockpit-produtividade (cwd)
loadDotenv({ path: resolve(process.cwd(), ".env.local") })

const REQUIRED_ENV = [
  "TELEGRAM_BOT_TOKEN",
  "GROQ_API_KEY",
  "ANTHROPIC_API_KEY",
  "DATABASE_URL",
  "CAPTURE_USER_ID",
] as const

const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error(`[captura] env vars faltando: ${missing.join(", ")}`)
  console.error(`[captura] adicione em .env.local na raiz de cockpit-produtividade`)
  console.error(`[captura] CAPTURE_USER_ID = id do user dono (pegar via prisma studio)`)
  process.exit(1)
}

const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID
  ? Number(process.env.TELEGRAM_OWNER_CHAT_ID)
  : null

const USER_ID = process.env.CAPTURE_USER_ID!

const VOCABULARY = (process.env.CAPTURE_VOCABULARY ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const { getUpdates, sendMessage, downloadFile, mdEscape } = await import("./lib/telegram.js")
const inbox = await import("./lib/inbox.js")
const { transcribe } = await import("./lib/transcribe.js")
const { classify } = await import("./lib/classify.js")
const { route, loadUserContext } = await import("./lib/router.js")

await inbox.loadInbox()
console.log("[captura] inbox carregada — last update_id:", inbox.getLastUpdateId())

const ENTITY_LABEL: Record<string, string> = {
  task: "📋 Tarefa",
  event: "📅 Evento",
  study_session: "📚 Sessão de Estudo",
}

function formatReply(itemType: string, result: Awaited<ReturnType<typeof route>>): string {
  if (!result.posted) {
    if (result.suggestions && result.suggestions.length) {
      const opts = result.suggestions.map((s) => `• ${mdEscape(s)}`).join("\n")
      return `❓ *Ambíguo* \\— escolhe:\n${opts}`
    }
    return `⚠️ Não postei: ${mdEscape(result.reason)}`
  }
  const label = ENTITY_LABEL[result.entity] ?? result.entity
  return `✓ *${mdEscape(label)}* registrado\n\n_id ${result.id}_`
}

async function processUpdate(update: import("./lib/telegram.js").TelegramUpdate) {
  const updateId = update.update_id
  if (inbox.hasSeen(updateId)) return

  const msg = update.message
  if (!msg) {
    await inbox.recordReceived(updateId, { kind: "non-message" })
    return
  }

  if (OWNER_CHAT_ID && msg.chat.id !== OWNER_CHAT_ID) {
    console.log(`[captura] ignorando msg de chat ${msg.chat.id} (owner=${OWNER_CHAT_ID})`)
    await inbox.recordReceived(updateId, {
      kind: "rejected",
      chatId: msg.chat.id,
      reason: "non-owner",
    })
    return
  }

  await inbox.recordReceived(updateId, {
    chatId: msg.chat.id,
    messageId: msg.message_id,
    kind: msg.voice ? "voice" : msg.text ? "text" : "other",
  })

  try {
    let text = msg.text ?? ""
    if (msg.voice || msg.audio) {
      const fileId = (msg.voice ?? msg.audio)!.file_id
      console.log(`[captura ${updateId}] baixando voz file_id=${fileId}`)
      const buffer = await downloadFile(fileId)
      console.log(`[captura ${updateId}] transcrevendo ${buffer.length} bytes`)
      const t = await transcribe(buffer, { vocabulary: VOCABULARY })
      text = t.text
      await inbox.update(updateId, {
        status: "transcribed",
        transcribed: text,
        transcribeMs: t.durationMs,
      })
      console.log(`[captura ${updateId}] transcrição: "${text.slice(0, 80)}…"`)
    }

    if (!text) {
      await inbox.update(updateId, { status: "error", error: "sem texto" })
      await sendMessage(msg.chat.id, mdEscape("⚠️ Mensagem sem texto/áudio."))
      return
    }

    const ctx = await loadUserContext(USER_ID)
    const { item, durationMs: classifyMs } = await classify(text, {
      areas: ctx.areas.map((a) => a.name),
      studies: ctx.studies.map((s) => s.title),
      vocabulary: VOCABULARY,
    })
    await inbox.update(updateId, {
      status: "classified",
      classified: item,
      classifyMs,
    })
    console.log(`[captura ${updateId}] classificado: ${item.type}`)

    const result = await route(item, ctx)
    await inbox.update(updateId, {
      status: result.posted ? "posted" : "ambiguous",
      postedTo: result.posted ? result.entity : undefined,
      postedId: result.posted ? result.id : undefined,
      reason: !result.posted ? result.reason : undefined,
    })

    await sendMessage(msg.chat.id, formatReply(item.type, result), {
      replyTo: msg.message_id,
    })
  } catch (err) {
    const error = err as Error
    console.error(`[captura ${updateId}] erro:`, error.message)
    await inbox.update(updateId, { status: "error", error: error.message })
    await inbox.bumpAttempts(updateId)
    try {
      await sendMessage(msg.chat.id, mdEscape(`❌ Erro: ${error.message}`), {
        replyTo: msg.message_id,
      })
    } catch {}
  }
}

let running = true
process.on("SIGTERM", () => {
  console.log("[captura] SIGTERM recebido — encerrando")
  running = false
})
process.on("SIGINT", () => {
  console.log("[captura] SIGINT recebido — encerrando")
  running = false
})

console.log("[captura] worker iniciado")
console.log("[captura] user id:", USER_ID)
console.log("[captura] owner chat:", OWNER_CHAT_ID ?? "(qualquer — modo aberto, INSEGURO)")
console.log(`[captura] vocabulário: ${VOCABULARY.length} termos`)

let offset = inbox.getLastUpdateId() + 1

while (running) {
  try {
    const updates = await getUpdates({ offset, timeoutSeconds: 30 })
    for (const u of updates) {
      await processUpdate(u)
      offset = u.update_id + 1
    }
  } catch (err) {
    console.error("[captura] erro no loop:", (err as Error).message)
    await new Promise((r) => setTimeout(r, 5000))
  }
}

console.log("[captura] loop encerrado")
process.exit(0)
