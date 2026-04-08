import { db } from "@/lib/db"
import type { CreateContentInput } from "@/types"

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

export async function updateContent(id: string, userId: string, data: Partial<CreateContentInput> & { phase?: string; publishedAt?: Date; publishedUrl?: string; hook?: string; script?: string; notes?: string }) {
  return db.content.update({ where: { id, userId }, data })
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
