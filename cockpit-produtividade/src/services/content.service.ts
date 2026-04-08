import { db } from "@/lib/db"
import type { CreateContentInput } from "@/types"
import type { ContentPhase, Platform, ContentFormat } from "@/generated/prisma/client"

export async function getContents(userId: string) {
  return db.content.findMany({
    where: { userId, isArchived: false },
    include: { area: true, metrics: true },
    orderBy: { updatedAt: "desc" },
  })
}

export async function createContent(userId: string, data: CreateContentInput) {
  return db.content.create({
    data: { ...data, userId },
    include: { area: true, metrics: true },
  })
}

export async function updateContent(id: string, userId: string, data: {
  title?: string
  platform?: Platform
  format?: ContentFormat
  phase?: ContentPhase
  hook?: string | null
  script?: string | null
  series?: string | null
  plannedDate?: Date | null
  publishedAt?: Date | null
  publishedUrl?: string | null
  notes?: string | null
  areaId?: string | null
}) {
  const { areaId, ...rest } = data
  return db.content.update({
    where: { id, userId },
    data: {
      ...rest,
      ...(areaId !== undefined && { area: areaId ? { connect: { id: areaId } } : { disconnect: true } }),
    },
  })
}

export async function archiveContent(id: string, userId: string) {
  return db.content.update({ where: { id, userId }, data: { isArchived: true } })
}

export async function getContentStats(userId: string) {
  const contents = await db.content.findMany({ where: { userId, isArchived: false }, select: { phase: true } })
  return {
    total: contents.length,
    ideas: contents.filter((c) => c.phase === "IDEA").length,
    inProduction: contents.filter((c) => ["SCRIPT","RECORDING","EDITING","REVIEW"].includes(c.phase)).length,
    scheduled: contents.filter((c) => c.phase === "SCHEDULED").length,
    published: contents.filter((c) => c.phase === "PUBLISHED").length,
  }
}
