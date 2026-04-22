// Eval offline do Stage 4 (narrativa). Usa NewsEvidence já capturadas pra validar
// mudanças de prompt sem rodar discovery/triagem/deep (que gastam créditos).
//
// Run: node --env-file=.env.local ./node_modules/.bin/tsx scripts/eval-narrative.ts

import { db } from "../src/lib/db"

async function main() {
  const users = await db.user.findMany({ select: { id: true, email: true } })
  const userId = users[0]?.id
  if (!userId) { console.log("Sem usuários."); process.exit(1) }

  // Pega 5-10 primários recentes com summary populado
  const evidences = await db.newsEvidence.findMany({
    where: { userId, summary: { not: "" }, relevanceScore: { gte: 70 } },
    orderBy: { capturedAt: "desc" },
    take: 10,
  })

  if (evidences.length === 0) {
    console.log("Sem NewsEvidence suficiente. Rode generate-ideas antes.")
    process.exit(1)
  }

  console.log(`\n═══ EVAL NARRATIVE — ${evidences.length} primários (user=${userId}) ═══\n`)
  evidences.forEach((ev, i) => {
    console.log(`[${i}] ${ev.term} · rel=${ev.relevanceScore} · ${ev.sourceAuthority}`)
    console.log(`    ${ev.title}`)
    console.log(`    ${ev.summary.slice(0, 120)}...`)
    console.log(`    quote: "${(ev.keyQuote ?? "").slice(0, 100)}..."`)
    console.log("")
  })

  console.log(`Pra plugar no runNarrativePhase, monte groups = primary + supporting a partir desses IDs.`)
  console.log(`Eval completa virá na sprint seguinte — por enquanto esse script só mostra os dados disponíveis.`)
  await db.$disconnect()
}

main().catch(async (err) => {
  console.error("ERRO:", err)
  await db.$disconnect()
  process.exit(1)
})
