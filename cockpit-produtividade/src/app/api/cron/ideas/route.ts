import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateModuleInsight } from "@/services/ai.service"

/**
 * Cron diário (8h via vercel.json) — gera AiInsight rotativo por dia da semana.
 *
 * Auth: Vercel Cron envia automaticamente `Authorization: Bearer ${CRON_SECRET}`
 * quando a env var `CRON_SECRET` está definida no projeto Vercel.
 * https://vercel.com/docs/cron-jobs#securing-cron-jobs
 *
 * Local dev: pode chamar manualmente com header
 *   curl -H "Authorization: Bearer dev" http://localhost:3010/api/cron/ideas
 * (com CRON_SECRET=dev no .env.local).
 *
 * Estratégia: roda pra todos os users do app (na prática 1, single-user).
 * Cada user recebe 1 insight por dia, do módulo da vez (rotativo seg-dom).
 */

const ROTATION: Array<"tasks" | "finance" | "studies"> = [
  "studies",  // domingo
  "tasks",    // segunda
  "finance",  // terça
  "tasks",    // quarta
  "studies",  // quinta
  "finance",  // sexta
  "tasks",    // sábado
]

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = req.headers.get("authorization") ?? ""
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const dayOfWeek = new Date().getDay()
  const module = ROTATION[dayOfWeek]

  const users = await db.user.findMany({ select: { id: true, email: true } })

  const results: Array<{ email: string; ok: boolean; error?: string }> = []
  for (const user of users) {
    try {
      await generateModuleInsight(user.id, module)
      results.push({ email: user.email, ok: true })
    } catch (err) {
      console.error(`[cron/ideas] erro pra ${user.email}:`, err)
      results.push({
        email: user.email,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({
    runAt: new Date().toISOString(),
    module,
    processed: results.length,
    results,
  })
}
