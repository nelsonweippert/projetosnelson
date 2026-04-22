import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { WeeklyAssessmentForm } from "../../../WeeklyAssessmentForm"

export default async function EditWeeklyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id
  const w = await db.weeklyAssessment.findFirst({ where: { id, userId } })
  if (!w) notFound()

  const students = await db.student.findMany({
    where: { userId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })
  const previous = await db.weeklyAssessment.findFirst({
    where: { userId, studentId: w.studentId, referenceWeek: { lt: w.referenceWeek } },
    orderBy: { referenceWeek: "desc" },
  })

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Editar avaliação semanal</h1>
      </header>
      <WeeklyAssessmentForm students={students} existing={w} previous={previous} />
    </div>
  )
}
