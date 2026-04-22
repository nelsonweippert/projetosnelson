import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AssessmentForm } from "../../AssessmentForm"

export default async function EditAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id
  const a = await db.monthlyAssessment.findFirst({ where: { id, userId } })
  if (!a) notFound()

  const students = await db.student.findMany({
    where: { userId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })

  const previous = await db.monthlyAssessment.findFirst({
    where: { userId, studentId: a.studentId, referenceMonth: { lt: a.referenceMonth } },
    orderBy: { referenceMonth: "desc" },
  })

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Editar avaliação</h1>
      </header>
      <AssessmentForm students={students} existing={a} previous={previous} />
    </div>
  )
}
