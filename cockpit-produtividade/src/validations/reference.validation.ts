import { z } from "zod"

export const createReferenceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  source: z.string().optional(),
  type: z.enum(["VIDEO", "ARTICLE", "BLOG", "PODCAST", "DOCUMENT", "OTHER"]).default("ARTICLE"),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]).default("NORMAL"),
  tags: z.array(z.string()).default([]),
  areaId: z.string().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
})

export type CreateReferenceInput = z.infer<typeof createReferenceSchema>
