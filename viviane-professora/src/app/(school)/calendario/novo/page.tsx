import { EventForm } from "../EventForm"

export default function NovoEventoPage() {
  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Novo evento</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          Aulas, reuniões, provas, prazos — tudo em um lugar.
        </p>
      </header>
      <EventForm />
    </div>
  )
}
