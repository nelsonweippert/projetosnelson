// API Route dedicada pra discovery de fontes — server actions tem timeout default
// curto (60s em dev), essa route declara maxDuration explícito pros ~2min do pipeline.

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { discoverSourcesForTerm } from "@/services/source-discovery.service"

export const maxDuration = 300 // 5 min — pipeline de 3 estágios leva ~2min, margem pra rate limits

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  let body: { termId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ success: false, error: "Body inválido" }, { status: 400 }) }
  const termId = body.termId
  if (!termId) return NextResponse.json({ success: false, error: "termId obrigatório" }, { status: 400 })

  try {
    const term = await db.monitorTerm.findFirst({ where: { id: termId, userId } })
    if (!term) return NextResponse.json({ success: false, error: "Termo não encontrado" }, { status: 404 })

    console.log(`[api/sources/discover] iniciando pipeline — user=${userId} term="${term.term}"`)
    const { sources, rejected, usage } = await discoverSourcesForTerm({
      term: term.term,
      intent: term.intent,
      userId,
    })

    // Merge com fontes existentes preservando isActive do usuário
    const existing = Array.isArray(term.sources) ? (term.sources as any[]) : []
    const existingByHost = new Map<string, any>(existing.map((s) => [s.host, s]))
    const merged = sources.map((s) => {
      const prev = existingByHost.get(s.host)
      return prev ? { ...s, isActive: prev.isActive ?? true } : s
    })
    for (const s of existing) {
      if (!merged.find((m) => m.host === s.host)) merged.push(s)
    }

    const updated = await db.monitorTerm.update({
      where: { id: termId, userId },
      data: {
        sources: merged as unknown as Prisma.InputJsonValue,
        sourcesUpdatedAt: new Date(),
      },
    })

    console.log(`[api/sources/discover] OK — found=${sources.length} merged=${merged.length} rejected=${rejected.length} duration=${usage.totalDurationMs}ms`)
    return NextResponse.json({
      success: true,
      data: {
        sources: merged,
        sourcesUpdatedAt: updated.sourcesUpdatedAt,
        _discovery: {
          found: sources.length,
          merged: merged.length,
          rejected,
          usage,
        },
      },
    })
  } catch (err) {
    console.error("[api/sources/discover] erro:", err)
    const msg = err instanceof Error ? err.message : "Erro ao descobrir fontes"
    // Stack trace útil no log do server
    if (err instanceof Error && err.stack) console.error(err.stack)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
