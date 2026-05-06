/**
 * Telegram Bot API client — fetch direto.
 *
 * Long-polling: getUpdates com timeout=30s + offset=last_id+1.
 */

const TG_API = "https://api.telegram.org"

const token = () => {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN ausente")
  return t
}

async function call<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TG_API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })
  const json = (await res.json()) as { ok: boolean; result: T; description?: string; error_code?: number }
  if (!json.ok) {
    const err = new Error(`telegram ${method} falhou: ${json.description}`) as Error & { code?: number; method?: string }
    err.code = json.error_code
    err.method = method
    throw err
  }
  return json.result
}

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    date: number
    text?: string
    voice?: { file_id: string; duration: number; mime_type?: string; file_size?: number }
    audio?: { file_id: string; duration: number; mime_type?: string; file_size?: number }
  }
}

export async function getUpdates(opts: { offset?: number; timeoutSeconds?: number } = {}): Promise<TelegramUpdate[]> {
  return call("getUpdates", {
    offset: opts.offset,
    timeout: opts.timeoutSeconds ?? 30,
    allowed_updates: ["message"],
  })
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts: { parseMode?: string; replyTo?: number; silent?: boolean } = {},
) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode ?? "MarkdownV2",
    reply_to_message_id: opts.replyTo,
    disable_notification: opts.silent ?? false,
  })
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const file = await call<{ file_path: string; file_size?: number }>("getFile", { file_id: fileId })
  const url = `${TG_API}/file/bot${token()}/${file.file_path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`telegram download falhou: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Escape MarkdownV2 — Telegram exige escape de _*[]()~`>#+-=|{}.! */
export function mdEscape(s: string | number): string {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`)
}
