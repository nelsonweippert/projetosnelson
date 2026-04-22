import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatDateLong } from "@/lib/utils"

export default async function LessonPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const plan = await db.lessonPlan.findFirst({ where: { id, userId: session!.user!.id } })
  if (!plan) notFound()

  const citations = plan.citations as Array<{ source: string; ref: string; url?: string }> | null

  return (
    <div className="max-w-4xl">
      <Link href="/planos-aula" className="text-xs text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
        ← Planos de aula
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-bold">{plan.title}</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          {plan.subject} · {plan.duration} min · {formatDateLong(plan.date)}
        </p>
        {plan.bnccCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {plan.bnccCodes.map((c) => <span key={c} className="app-pill">{c}</span>)}
          </div>
        )}
      </header>

      <div className="space-y-4">
        <Section title="Objetivos de aprendizagem" body={plan.objectives} />
        {plan.skills && <Section title="Habilidades desenvolvidas" body={plan.skills} />}
        {plan.content && <Section title="Conteúdo" body={plan.content} />}
        {plan.methodology && <Section title="Metodologia" body={plan.methodology} />}
        {plan.materials && <Section title="Materiais" body={plan.materials} />}
        {plan.activities && <Section title="Atividades (passo a passo)" body={plan.activities} />}
        {plan.assessment && <Section title="Avaliação" body={plan.assessment} />}
        {plan.homework && <Section title="Dever de casa" body={plan.homework} />}
        {plan.adaptations && <Section title="Adaptações" body={plan.adaptations} />}

        {citations && citations.length > 0 && (
          <div className="app-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
              Citações
            </h2>
            <ul className="space-y-1.5 text-sm">
              {citations.map((c, i) => (
                <li key={i}>
                  <strong>{c.source}</strong> — {c.ref}
                  {c.url && <> · <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-dark">link</a></>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="app-card">
      <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
        {title}
      </h2>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{body}</p>
    </div>
  )
}
