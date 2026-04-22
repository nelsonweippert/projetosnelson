import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"

const TYPE_LABEL: Record<string, string> = {
  EXERCISE: "Exercícios", ASSESSMENT: "Avaliação", PROJECT: "Projeto",
  GAME: "Jogo", READING: "Leitura", WRITING: "Produção", OTHER: "Outro",
}

export default async function AtividadesPage() {
  const session = await auth()
  const acts = await db.activity.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  })

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="ACTIVITIES"
        right={<Link href="/atividades/nova" className="app-btn-primary">+ Nova atividade</Link>}
      />

      {acts.length === 0 ? (
        <div className="app-card text-center py-10">
          <div className="text-4xl mb-2">🧩</div>
          <h2 className="text-lg font-bold mb-1">Nenhuma atividade ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            Liste exercícios gerados pela IA, com gabarito e alinhamento BNCC.
          </p>
          <Link href="/atividades/nova" className="app-btn-primary inline-block">Gerar primeira</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {acts.map((a) => (
            <li key={a.id}>
              <Link href={`/atividades/${a.id}`} className="app-card app-card-clickable block">
                <div className="flex justify-between items-baseline gap-2">
                  <strong>{a.title}</strong>
                  <span className="app-pill">{TYPE_LABEL[a.type] ?? a.type}</span>
                </div>
                <div className="text-xs text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
                  {a.subject} · {a.difficulty} {a.estimatedMin && `· ${a.estimatedMin}min`} {a.bnccCodes.length > 0 && `· ${a.bnccCodes.slice(0, 3).join(", ")}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
