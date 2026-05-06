import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  // Garante que o study pertence ao user
  const study = await db.study.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!study) {
    return NextResponse.json({ error: "Estudo não encontrado" }, { status: 404 })
  }

  const sessions = await db.studySession.findMany({
    where: { studyId: id, userId: session.user.id },
    orderBy: { date: "desc" },
    take: 100,
  })

  return NextResponse.json(sessions)
}
