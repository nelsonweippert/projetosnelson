/**
 * State file — worker/captura/data/inbox.json
 *
 * Idempotency por update_id. Carregado em memória no start, persistido
 * a cada mutação (writes serializados pra evitar corrupção).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"

const INBOX_PATH = resolve(process.cwd(), "worker/captura/data/inbox.json")

type ItemRecord = {
  status: "received" | "transcribed" | "classified" | "posted" | "error" | "ambiguous"
  attempts: number
  receivedAt: string
  updatedAt: string
  chatId?: number
  messageId?: number
  kind?: string
  text?: string
  transcribed?: string
  transcribeMs?: number
  classified?: unknown
  classifyMs?: number
  postedTo?: string
  postedId?: string
  reason?: string
  error?: string
}

type State = { lastUpdateId: number; items: Record<number, ItemRecord> }

let state: State = { lastUpdateId: 0, items: {} }
let writeQueue: Promise<unknown> = Promise.resolve()

export async function loadInbox(): Promise<State> {
  await mkdir(dirname(INBOX_PATH), { recursive: true })
  if (!existsSync(INBOX_PATH)) {
    await writeFile(INBOX_PATH, JSON.stringify(state, null, 2))
    return state
  }
  try {
    const raw = await readFile(INBOX_PATH, "utf8")
    state = JSON.parse(raw)
    state.items ??= {}
    state.lastUpdateId ??= 0
  } catch (err) {
    console.error("[inbox] erro ao ler inbox.json:", (err as Error).message)
    state = { lastUpdateId: 0, items: {} }
  }
  return state
}

async function persist() {
  writeQueue = writeQueue.then(() => writeFile(INBOX_PATH, JSON.stringify(state, null, 2)))
  return writeQueue
}

export function hasSeen(updateId: number): boolean {
  return updateId in state.items
}

export function getLastUpdateId(): number {
  return state.lastUpdateId
}

export async function recordReceived(updateId: number, payload: Partial<ItemRecord>) {
  const now = new Date().toISOString()
  state.items[updateId] = {
    status: "received",
    attempts: 0,
    ...payload,
    receivedAt: now,
    updatedAt: now,
  } as ItemRecord
  state.lastUpdateId = Math.max(state.lastUpdateId, updateId)
  await persist()
}

export async function update(updateId: number, patch: Partial<ItemRecord>) {
  if (!state.items[updateId]) return
  state.items[updateId] = {
    ...state.items[updateId],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await persist()
}

export async function bumpAttempts(updateId: number) {
  if (!state.items[updateId]) return
  state.items[updateId].attempts = (state.items[updateId].attempts ?? 0) + 1
  state.items[updateId].updatedAt = new Date().toISOString()
  await persist()
}
