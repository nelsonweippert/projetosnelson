import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatDate, initials } from "@/lib/utils"

export default async function StudentsPage() {
  const session = await auth()
  const students = await db.student.findMany({
    where: { userId: session!.user!.id, isActive: true },
    orderBy: { fullName: "asc" },
  })

  return (
    <div className="max-w-6xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
            {students.length} aluno{students.length === 1 ? "" : "s"} ativo{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/alunos/novo" className="app-btn-primary">
          + Novo aluno
        </Link>
      </header>

      {students.length === 0 ? (
        <div className="app-card text-center py-12">
          <div className="text-4xl mb-2">👧</div>
          <h2 className="text-lg font-bold mb-1">Nenhum aluno ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            Cadastre sua turma pra começar a usar as outras skills.
          </p>
          <Link href="/alunos/novo" className="app-btn-primary inline-block">
            Cadastrar primeiro aluno
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((s) => (
            <Link key={s.id} href={`/alunos/${s.id}`} className="app-card app-card-clickable">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-dark)" }}
                >
                  {initials(s.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{s.fullName}</div>
                  <div className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                    {s.classroom ?? "sem turma"}
                    {s.birthDate && ` · nasc. ${formatDate(s.birthDate)}`}
                  </div>
                </div>
              </div>
              {s.specialNeeds && (
                <div className="mt-2 text-xs app-pill" style={{ background: "#FEF3C7", color: "#92400E" }}>
                  {s.specialNeeds}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
