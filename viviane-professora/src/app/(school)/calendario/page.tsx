import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { formatDateTime } from "@/lib/utils"

const TYPE_INFO: Record<string, { label: string; color: string }> = {
  CLASS: { label: "📘 Aula", color: "#DBEAFE" },
  MEETING: { label: "🤝 Reunião", color: "#FEF3C7" },
  PARENT_MEETING: { label: "👨‍👩‍👧 Pais", color: "#FCE7F3" },
  ASSESSMENT: { label: "📝 Avaliação", color: "#FEE2E2" },
  EVENT: { label: "🎉 Evento", color: "#D1FAE5" },
  HOLIDAY: { label: "🏖️ Recesso", color: "#E0E7FF" },
  DEADLINE: { label: "⏰ Prazo", color: "#FED7AA" },
  PERSONAL: { label: "Pessoal", color: "#F3F4F6" },
  OTHER: { label: "Outro", color: "#F3F4F6" },
}

export default async function CalendarioPage() {
  const session = await auth()
  const now = new Date()

  const [upcoming, past] = await Promise.all([
    db.calendarEvent.findMany({
      where: { userId: session!.user!.id, startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 30,
    }),
    db.calendarEvent.findMany({
      where: { userId: session!.user!.id, startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      take: 10,
    }),
  ])

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="CALENDAR"
        right={<Link href="/calendario/novo" className="app-btn-primary">+ Novo evento</Link>}
      />

      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
          Próximos ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="app-card text-center py-8">
            <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
              Nenhum evento futuro. <Link href="/calendario/novo" className="underline hover:text-accent-dark">Criar primeiro</Link>.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => <EventRow key={e.id} event={e} />)}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Passados
          </h2>
          <ul className="space-y-2 opacity-60">
            {past.map((e) => <EventRow key={e.id} event={e} />)}
          </ul>
        </section>
      )}
    </div>
  )
}

type EventRowProps = Awaited<ReturnType<typeof import("@/lib/db").db.calendarEvent.findMany>>[number]

function EventRow({ event }: { event: EventRowProps }) {
  const info = TYPE_INFO[event.type] ?? TYPE_INFO.OTHER
  return (
    <li className="app-card">
      <div className="flex justify-between items-baseline gap-2">
        <strong>{event.title}</strong>
        <span className="app-pill" style={{ background: info.color, color: "var(--color-app-text)" }}>
          {info.label}
        </span>
      </div>
      <div className="text-xs text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
        {event.allDay ? (
          <>Dia inteiro · {new Date(event.startAt).toLocaleDateString("pt-BR")}</>
        ) : (
          <>{formatDateTime(event.startAt)}{event.endAt ? ` → ${formatDateTime(event.endAt)}` : ""}</>
        )}
        {event.location && <> · {event.location}</>}
        {event.recurrence && <> · {event.recurrence.toLowerCase()}</>}
      </div>
      {event.description && <p className="text-sm mt-2">{event.description}</p>}
    </li>
  )
}
