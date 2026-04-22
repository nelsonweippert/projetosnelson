// Standalone: chama generateIdeasWithResearch direto e mostra os counters.
// Usa userId do primeiro user com monitorTerms ativos.
// Run: node --env-file=.env.local ./node_modules/.bin/tsx scripts/test-pipeline.ts

import { db } from "../src/lib/db"
import { generateIdeasWithResearch } from "../src/services/ai.service"

async function main() {
  const usersWithTerms = await db.monitorTerm.findMany({
    where: { isActive: true },
    select: { userId: true, term: true, intent: true },
  })
  if (usersWithTerms.length === 0) {
    console.log("Sem termos ativos. Crie termos no /conteudo primeiro.")
    process.exit(1)
  }

  const byUser: Record<string, { terms: string[]; intents: Record<string, string> }> = {}
  for (const { userId, term, intent } of usersWithTerms) {
    if (!byUser[userId]) byUser[userId] = { terms: [], intents: {} }
    byUser[userId].terms.push(term)
    if (intent) byUser[userId].intents[term] = intent
  }

  const [userId, { terms, intents }] = Object.entries(byUser)[0]
  console.log(`\n═══ TESTE PIPELINE — user=${userId} ═══`)
  console.log(`Termos: ${terms.join(", ")}`)
  if (Object.keys(intents).length) console.log(`Intents:`, intents)
  console.log("")

  const t0 = Date.now()
  const { ideas, usage } = await generateIdeasWithResearch({
    terms, termIntents: intents, ideasPerTerm: 2, hoursWindow: 72, language: "both", userId,
  })
  const durationMs = Date.now() - t0

  console.log(`\n═══ RESULTADO (${(durationMs / 1000).toFixed(1)}s) ═══`)
  console.log(`ideias:           ${ideas.length}`)
  console.log(`stage1 discovery: ${usage.candidatesFromRss} candidatos`)
  console.log(`stage2 triagem:   ${usage.qualifiedAfterTriage} qualificados`)
  console.log(`stage3 apoio:     ${usage.supportingFound} fontes`)
  console.log(`searches used:    ${usage.searchesUsed}`)
  console.log(`fetches used:     ${usage.fetchesUsed}`)
  console.log(`tokens in/out:    ${usage.inputTokens} / ${usage.outputTokens}`)

  if (ideas.length > 0) {
    console.log("\n═══ IDEIAS ═══")
    ideas.forEach((i, idx) => {
      console.log(`\n[${idx + 1}] ${i.title}`)
      console.log(`    term="${i.term}" pioneer=${i.pioneerScore} viral=${i.viralScore}`)
      console.log(`    source: ${i.sourceTitle} (${i.sourceUrl})`)
      console.log(`    publishers: ${i.publisherHosts.join(", ")}`)
    })
  }

  await db.$disconnect()
}

main().catch(async (err) => {
  console.error("ERRO:", err)
  await db.$disconnect()
  process.exit(1)
})
