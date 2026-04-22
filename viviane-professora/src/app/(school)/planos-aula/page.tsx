import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { formatDate } from "@/lib/utils"

export default async function PlanosAulaPage() {
  const session = await auth()
  const plans = await db.lessonPlan.findMany({
    where: { userId: session!.user!.id },
    orderBy: { date: "desc" },
    take: 40,
  })

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="LESSON_PLANS"
        right={<Link href="/planos-aula/novo" className="app-btn-primary">+ Novo plano</Link>}
      />

      {plans.length === 0 ? (
        <div className="app-card text-center py-10">
          <div className="text-4xl mb-2">📚</div>
          <h2 className="text-lg font-bold mb-1">Nenhum plano ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            IA pesquisa a BNCC e monta plano estruturado com objetivos, atividades e avaliação.
          </p>
          <Link href="/planos-aula/novo" className="app-btn-primary inline-block">Gerar primeiro</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id}>
              <Link href={`/planos-aula/${p.id}`} className="app-card app-card-clickable block">
                <div className="flex justify-between items-baseline gap-2">
                  <strong>{p.title}</strong>
                  <span className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                    {formatDate(p.date)}
                  </span>
                </div>
                <div className="text-xs text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
                  {p.subject} · {p.duration}min {p.bnccCodes.length > 0 && `· ${p.bnccCodes.slice(0, 3).join(", ")}${p.bnccCodes.length > 3 ? "..." : ""}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
