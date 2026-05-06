import { z } from "zod"

/**
 * Schema canônico do item capturado pelo worker.
 *
 * Discriminated union — o LLM classifica em UM tipo por item e extrai os
 * campos relevantes. Multi-intent ("amanhã reunião com X 14h E criar
 * tarefa de slides") agora é suportado via CapturedBatchSchema (items[]).
 *
 * Mapeia direto pros models do Prisma:
 * - task           → Task
 * - event          → CalendarEvent
 * - study_session  → StudySession (topic_hint resolve pra Study via match)
 * - note           → Note (FREE/JOURNAL/MEETING/IDEA)
 * - ambiguous      → Task LOW pra revisão manual
 */

const TaskSchema = z.object({
  type: z.literal("task"),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  due_date: z.string().nullable(),
  area_hint: z.string().nullable(),
})

const EventSchema = z.object({
  type: z.literal("event"),
  title: z.string(),
  date: z.string(),
  end_date: z.string().nullable(),
  location: z.string().nullable(),
  attendees: z.array(z.string()),
  description: z.string().nullable(),
  area_hint: z.string().nullable(),
})

const StudySessionSchema = z.object({
  type: z.literal("study_session"),
  topic_hint: z.string(),
  hours: z.number().min(0.25).max(24),
  note: z.string().nullable(),
})

const NoteSchema = z.object({
  type: z.literal("note"),
  note_type: z.enum(["FREE", "JOURNAL", "MEETING", "IDEA"]).default("FREE"),
  title: z.string().nullable(),
  content: z.string().min(1),
  area_hints: z.array(z.string()).default([]),
})

const AmbiguousSchema = z.object({
  type: z.literal("ambiguous"),
  suggestions: z.array(z.string()),
  raw: z.string(),
})

export const CapturedItemSchema = z.discriminatedUnion("type", [
  TaskSchema,
  EventSchema,
  StudySessionSchema,
  NoteSchema,
  AmbiguousSchema,
])

export const CapturedBatchSchema = z.object({
  items: z.array(CapturedItemSchema).min(1).max(5),
})

export type CapturedItem = z.infer<typeof CapturedItemSchema>
export type CapturedBatch = z.infer<typeof CapturedBatchSchema>
