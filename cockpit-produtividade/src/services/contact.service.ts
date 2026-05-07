import { db } from "@/lib/db"

const INCLUDE_RELATIONS = {
  area: true,
  _count: { select: { linkedNotes: true } },
}

export async function getContacts(
  userId: string,
  filters?: { q?: string; areaId?: string },
) {
  const where: Record<string, unknown> = { userId, isArchived: false }
  if (filters?.areaId) where.areaId = filters.areaId
  if (filters?.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { company: { contains: filters.q, mode: "insensitive" } },
      { project: { contains: filters.q, mode: "insensitive" } },
      { telegram: { contains: filters.q, mode: "insensitive" } },
      { twitter: { contains: filters.q, mode: "insensitive" } },
    ]
  }

  // Ordem: lastContactAt asc (mais antigos primeiro = follow-up mais atrasado),
  // contatos sem lastContactAt no final
  return db.contact.findMany({
    where,
    include: INCLUDE_RELATIONS,
    orderBy: [
      { lastContactAt: { sort: "asc", nulls: "last" } },
      { name: "asc" },
    ],
  })
}

export async function getContactById(id: string, userId: string) {
  return db.contact.findFirst({
    where: { id, userId },
    include: {
      area: true,
      linkedNotes: {
        where: { isArchived: false },
        orderBy: { date: "desc" },
        take: 100,
        include: { areas: { include: { area: true } } },
      },
    },
  })
}

export async function createContact(
  userId: string,
  data: {
    name: string
    company?: string
    project?: string
    telegram?: string
    twitter?: string
    notes?: string
    areaId?: string | null
  },
) {
  const empty = (v?: string) => (v && v.length > 0 ? v : null)
  return db.contact.create({
    data: {
      userId,
      name: data.name,
      company: empty(data.company),
      project: empty(data.project),
      telegram: empty(data.telegram),
      twitter: empty(data.twitter),
      notes: empty(data.notes),
      areaId: data.areaId || null,
    },
    include: INCLUDE_RELATIONS,
  })
}

export async function updateContact(
  id: string,
  userId: string,
  data: {
    name?: string
    company?: string
    project?: string
    telegram?: string
    twitter?: string
    notes?: string
    areaId?: string | null
  },
) {
  const empty = (v?: string) =>
    v === undefined ? undefined : v.length > 0 ? v : null
  return db.contact.update({
    where: { id, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.company !== undefined && { company: empty(data.company) }),
      ...(data.project !== undefined && { project: empty(data.project) }),
      ...(data.telegram !== undefined && { telegram: empty(data.telegram) }),
      ...(data.twitter !== undefined && { twitter: empty(data.twitter) }),
      ...(data.notes !== undefined && { notes: empty(data.notes) }),
      ...(data.areaId !== undefined && { areaId: data.areaId || null }),
    },
    include: INCLUDE_RELATIONS,
  })
}

export async function archiveContact(id: string, userId: string) {
  return db.contact.update({
    where: { id, userId },
    data: { isArchived: true },
  })
}

export async function getContactStats(userId: string) {
  const all = await db.contact.findMany({
    where: { userId, isArchived: false },
    select: { lastContactAt: true },
  })
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  let neverContacted = 0
  let staleOver14d = 0
  let staleOver30d = 0
  for (const c of all) {
    if (!c.lastContactAt) {
      neverContacted++
      continue
    }
    const age = now - c.lastContactAt.getTime()
    if (age > 30 * day) staleOver30d++
    else if (age > 14 * day) staleOver14d++
  }

  return {
    total: all.length,
    neverContacted,
    staleOver14d,
    staleOver30d,
    needsFollowUp: neverContacted + staleOver14d + staleOver30d,
  }
}

/**
 * Atualiza Contact.lastContactAt = now() quando uma nota é criada com
 * este contato. Chamado pelo router do worker e pelas actions de Note
 * que setam contactId.
 */
export async function touchContactLastContact(
  id: string,
  userId: string,
  date?: Date,
) {
  return db.contact.update({
    where: { id, userId },
    data: { lastContactAt: date ?? new Date() },
  })
}
