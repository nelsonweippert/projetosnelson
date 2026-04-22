import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { formatDate } from "@/lib/utils"

const TYPE_LABEL: Record<string, string> = {
  NOTE: "📝 Bilhete", EMAIL: "📧 E-mail", WHATSAPP: "💬 WhatsApp",
  MEETING: "🤝 Reunião", PHONE_CALL: "📞 Ligação", OTHER: "Outro",
}

export default async function ComunicacaoPage() {
  const session = await auth()
  const comms = await db.communication.findMany({
    where: { userId: session!.user!.id },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  })

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="COMMUNICATION"
        right={<Link href="/comunicacao/nova" className="app-btn-primary">+ Nova mensagem</Link>}
      />

      {comms.length === 0 ? (
        <div className="app-card text-center py-10">
          <div className="text-4xl mb-2">💬</div>
          <h2 className="text-lg font-bold mb-1">Nenhuma mensagem ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            Bilhetes, e-mails, atas de reunião — todos com rascunho IA.
          </p>
          <Link href="/comunicacao/nova" className="app-btn-primary inline-block">Primeira mensagem</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {comms.map((c) => (
            <li key={c.id} className="app-card">
              <div className="flex justify-between items-baseline gap-2 mb-1">
                <div className="font-semibold">{c.subject}</div>
                <span className="app-pill">{c.status}</span>
              </div>
              <div className="text-xs text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
                {TYPE_LABEL[c.type] ?? c.type}
                {c.student && <> · <Link href={`/alunos/${c.studentId}`} className="hover:text-accent-dark">{c.student.fullName}</Link></>}
                {" · "}{formatDate(c.createdAt)}
              </div>
              <p className="text-sm line-clamp-3 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
