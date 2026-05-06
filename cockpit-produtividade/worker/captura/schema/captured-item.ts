import { z } from "zod"

/**
 * Schema canônico do item capturado pelo worker.
 *
 * Discriminated union: o LLM classifica em UM tipo e extrai os campos
 * relevantes. Quando ambiguo ou multi-intent, força "ambiguous".
 *
 * Mapeia diretamente pros models do Prisma:
 * - task → Task
 * - event → CalendarEvent
 * - study_session → StudySession (topic_hint resolve pra Study via match)
 * - ambiguous → Task (priority LOW, description = transcrição) pra revisão manual
 */
export const CapturedItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("task"),
    title: z.string(),
    description: z.string().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    due_date: z.string().nullable(),
    area_hint: z.string().nullable(),
  }),

  z.object({
    type: z.literal("event"),
    title: z.string(),
    date: z.string(), // ISO required — sem data, vira task
    end_date: z.string().nullable(),
    location: z.string().nullable(),
    attendees: z.array(z.string()),
    description: z.string().nullable(),
  }),

  z.object({
    type: z.literal("study_session"),
    topic_hint: z.string(),
    hours: z.number().min(0.25).max(24),
    note: z.string().nullable(),
  }),

  z.object({
    type: z.literal("ambiguous"),
    suggestions: z.array(z.string()),
    raw: z.string(),
  }),
])

export type CapturedItem = z.infer<typeof CapturedItemSchema>
