import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { formatDate } from "@/lib/utils"

const CATEGORY_LABEL: Record<string, string> = {
  BEHAVIOR: "Comportamento", ACADEMIC: "Acadêmico", SOCIAL: "Social",
  EMOTIONAL: "Emocional", HEALTH: "Saúde", PARTICIPATION: "Participação", OTHER: "Outro",
}
const SENTIMENT_EMOJI: Record<string, string> = {
  POSITIVE: "😊", NEUTRAL: "😐", CONCERN: "⚠️", URGENT: "🚨",
}

export default async function ObservacoesPage() {
  const session = await auth()
  const obs = await db.observation.findMany({
    where: { userId: session!.user!.id },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: "desc" },
    take: 60,
  })

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="OBSERVATIONS"
        right={<Link href="/observacoes/nova" className="app-btn-primary">+ Nova</Link>}
      />

      {obs.length === 0 ? (
        <div className="app-card text-center py-10">
          <div className="text-4xl mb-2">✍️</div>
          <h2 className="text-lg font-bold mb-1">Nenhuma observação ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            Registre o que acontece na sala — vira matéria-prima pros relatórios descritivos.
          </p>
          <Link href="/observacoes/nova" className="app-btn-primary inline-block">Fazer primeira</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {obs.map((o) => (
            <li key={o.id} className="app-card">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{SENTIMENT_EMOJI[o.sentiment] ?? "😐"}</span>
                  <Link href={`/alunos/${o.studentId}`} className="font-semibold truncate hover:text-accent-dark">
                    {o.student.fullName}
                  </Link>
                </div>
                <span className="text-xs text-app-muted shrink-0" style={{ color: "var(--color-app-muted)" }}>
                  {formatDate(o.occurredAt)}
                </span>
              </div>
              <div className="text-sm font-medium">{o.title}</div>
              <p className="text-sm text-app-text mt-1">{o.note}</p>
              <div className="flex flex-wrap gap-1 mt-2 text-[11px]">
                <span className="app-pill">{CATEGORY_LABEL[o.category] ?? o.category}</span>
                {o.subject && (
                  <span className="app-pill" style={{ background: "var(--color-app-border-light)", color: "var(--color-app-muted)" }}>
                    {o.subject}
                  </span>
                )}
                {o.aiTags?.slice(0, 3).map((t) => (
                  <span key={t} className="app-pill" style={{ background: "var(--color-app-border-light)", color: "var(--color-app-muted)" }}>
                    #{t}
                  </span>
                ))}
              </div>
              {o.aiSummary && (
                <p className="text-xs mt-2 italic text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                  ✨ {o.aiSummary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
