import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { formatDate } from "@/lib/utils"

export default async function CorrecoesPage() {
  const session = await auth()
  const items = await db.correction.findMany({
    where: { userId: session!.user!.id },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  })

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="CORRECTIONS"
        right={<Link href="/correcoes/nova" className="app-btn-primary">+ Nova correção</Link>}
      />

      {items.length === 0 ? (
        <div className="app-card text-center py-10">
          <div className="text-4xl mb-2">📸</div>
          <h2 className="text-lg font-bold mb-1">Nenhuma correção ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            Tire uma foto do caderno do aluno e deixe a IA sugerir a correção.
          </p>
          <Link href="/correcoes/nova" className="app-btn-primary inline-block">Fazer primeira</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="app-card">
              <div className="flex justify-between items-baseline gap-2">
                <div>
                  <Link href={`/alunos/${c.studentId}`} className="font-semibold hover:text-accent-dark">
                    {c.student.fullName}
                  </Link>
                  <span className="mx-1.5 text-app-muted" style={{ color: "var(--color-app-muted)" }}>·</span>
                  <span className="font-medium">{c.title}</span>
                </div>
                <span className="app-pill">{c.status}</span>
              </div>
              <div className="text-xs text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
                {c.subject} {c.grade && `· Nota: ${c.grade}`} · {formatDate(c.createdAt)}
              </div>
              {c.feedback && <p className="text-sm mt-2 line-clamp-2">{c.feedback}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
