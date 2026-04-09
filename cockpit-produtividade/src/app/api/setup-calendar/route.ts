import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const results: Record<string, string> = {}

  try {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "EventType" AS ENUM ('MEETING', 'ATA', 'ACTION', 'GENERAL');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    results.enum = "ok"
  } catch (e: any) {
    results.enum = e.message
  }

  try {
    await db.$executeRawUnsafe(`
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
        CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
      )
    `)
    results.table = "ok"
  } catch (e: any) {
    results.table = e.message
  }

  try {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_userId_fkey'
        ) THEN
          ALTER TABLE "calendar_events"
            ADD CONSTRAINT "calendar_events_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    results.fk_user = "ok"
  } catch (e: any) {
    results.fk_user = e.message
  }

  try {
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_areaId_fkey'
        ) THEN
          ALTER TABLE "calendar_events"
            ADD CONSTRAINT "calendar_events_areaId_fkey"
            FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    results.fk_area = "ok"
  } catch (e: any) {
    results.fk_area = e.message
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "calendar_events_userId_date_idx"
      ON "calendar_events"("userId", "date")
    `)
    results.index = "ok"
  } catch (e: any) {
    results.index = e.message
  }

  return NextResponse.json(results)
}
