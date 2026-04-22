import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface ActivityItem {
  number: number
  question: string
  type: string
  options?: string[]
  answer?: string
  tip?: string
}

export default async function AtividadeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const act = await db.activity.findFirst({ where: { id, userId: session!.user!.id } })
  if (!act) notFound()

  const items = (act.items as ActivityItem[] | null) ?? []

  return (
    <div className="max-w-3xl">
      <Link href="/atividades" className="text-xs text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
        ← Atividades
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-bold">{act.title}</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          {act.subject} · {act.type} · {act.difficulty} {act.estimatedMin && `· ${act.estimatedMin} min`}
        </p>
        {act.bnccCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {act.bnccCodes.map((c) => <span key={c} className="app-pill">{c}</span>)}
          </div>
        )}
      </header>

      <div className="app-card mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
          Enunciado geral
        </h2>
        <p className="text-sm whitespace-pre-wrap">{act.instructions}</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.number} className="app-card">
            <div className="flex items-start gap-2 mb-2">
              <span className="font-bold text-accent-dark shrink-0" style={{ color: "var(--color-accent-dark)" }}>
                {item.number}.
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.question}</p>
                <div className="text-[11px] text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
                  {item.type}
                </div>
              </div>
            </div>
            {item.options && item.options.length > 0 && (
              <ol className="ml-7 mt-2 space-y-1 text-sm list-[lower-alpha]">
                {item.options.map((o, i) => <li key={i}>{o}</li>)}
              </ol>
            )}
            {item.answer && (
              <details className="ml-7 mt-2">
                <summary className="text-xs font-semibold cursor-pointer hover:text-accent-dark">
                  Gabarito
                </summary>
                <p className="text-xs mt-1 text-app-muted" style={{ color: "var(--color-app-muted)" }}>{item.answer}</p>
              </details>
            )}
            {item.tip && (
              <div className="ml-7 mt-2 text-xs italic text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                💡 {item.tip}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
