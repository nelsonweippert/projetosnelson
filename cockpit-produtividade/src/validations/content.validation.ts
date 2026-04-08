import { z } from "zod"

export const createContentSchema = z.object({
  title: z.string().min(1).max(200),
  platform: z.enum(["YOUTUBE", "INSTAGRAM", "TIKTOK", "TWITCH", "OTHER"]).default("YOUTUBE"),
  format: z.enum(["LONG_VIDEO", "SHORT", "REELS", "POST", "LIVE", "THREAD"]).default("LONG_VIDEO"),
  hook: z.string().optional(),
  series: z.string().optional(),
  plannedDate: z.coerce.date().optional().nullable(),
  areaId: z.string().optional().nullable(),
})

export type CreateContentInput = z.infer<typeof createContentSchema>
