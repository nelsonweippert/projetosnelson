import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    await db.$executeRaw`CREATE TYPE IF NOT EXISTS "EventType" AS ENUM ('MEETING', 'ATA', 'ACTION', 'GENERAL')`
  } catch {
    // type may already exist
  }

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "calendar_events" (
      "id"          TEXT NOT NULL,
      "title"       TEXT NOT NULL,
      "type"        "EventType" NOT NULL DEFAULT 'GENERAL',
      "date"        TIMESTAMP(3) NOT NULL,
      "endDate"     TIMESTAMP(3),
      "description" TEXT,
      "location"    TEXT,
      "attendees"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "notes"       TEXT,
      "isArchived"  BOOLEAN NOT NULL DEFAULT false,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId"      TEXT NOT NULL,
      "areaId"      TEXT,
      CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "calendar_events_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "calendar_events_areaId_fkey"
        FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `

  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "calendar_events_userId_date_idx"
    ON "calendar_events"("userId", "date")
  `

  return NextResponse.json({ ok: true, message: "Tabela calendar_events criada com sucesso" })
}
