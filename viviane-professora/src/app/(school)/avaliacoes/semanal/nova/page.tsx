import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { WeeklyAssessmentForm } from "../../WeeklyAssessmentForm"

export default async function NovaSemanalPage({ searchParams }: { searchParams: Promise<{ aluno?: string; semana?: string }> }) {
  const sp = await searchParams
  const session = await auth()
  const userId = session!.user!.id
  const students = await db.student.findMany({
    where: { userId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })

  // Se houver aluno pré-selecionado, busca última semanal pra mostrar comparativo
  let previous = null
  if (sp.aluno) {
    previous = await db.weeklyAssessment.findFirst({
      where: { userId, studentId: sp.aluno },
      orderBy: { referenceWeek: "desc" },
    })
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nova avaliação semanal</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          8 eixos rápidos — ideal 2-3 min por aluno, sexta-feira ao fim da semana.
        </p>
      </header>
      <WeeklyAssessmentForm students={students} initialStudentId={sp.aluno} initialWeek={sp.semana} previous={previous} />
    </div>
  )
}
