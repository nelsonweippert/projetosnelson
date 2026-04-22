import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { StudentForm } from "../../StudentForm"

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const student = await db.student.findFirst({ where: { id, userId: session!.user!.id } })
  if (!student) notFound()

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Editar — {student.fullName}</h1>
      </header>
      <StudentForm student={student} />
    </div>
  )
}
