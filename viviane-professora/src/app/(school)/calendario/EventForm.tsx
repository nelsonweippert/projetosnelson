"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FormField, FormSection } from "@/components/FormField"
import { createEventAction } from "@/app/actions/calendar.actions"

const TYPES = [
  { value: "CLASS", label: "📘 Aula" },
  { value: "MEETING", label: "🤝 Reunião pedagógica" },
  { value: "PARENT_MEETING", label: "👨‍👩‍👧 Reunião com pais" },
  { value: "ASSESSMENT", label: "📝 Prova / avaliação" },
  { value: "EVENT", label: "🎉 Evento escolar" },
  { value: "HOLIDAY", label: "🏖️ Feriado / recesso" },
  { value: "DEADLINE", label: "⏰ Prazo" },
  { value: "PERSONAL", label: "Pessoal" },
  { value: "OTHER", label: "Outro" },
]

export function EventForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const today = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState({
    title: "",
    type: "CLASS" as "CLASS" | "MEETING" | "PARENT_MEETING" | "ASSESSMENT" | "EVENT" | "HOLIDAY" | "DEADLINE" | "PERSONAL" | "OTHER",
    startAt: today,
    endAt: "",
    allDay: false,
    location: "",
    description: "",
    notes: "",
    recurrence: "NONE" as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY",
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await createEventAction({ ...form, endAt: form.endAt || null })
      if (!res.success) { setError(res.error); return }
      router.push("/calendario")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Detalhes">
        <FormField label="Título" required full>
          <input className="app-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </FormField>
        <FormField label="Tipo" required>
          <select className="app-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Dia inteiro">
          <label className="flex items-center gap-2 text-sm pt-2">
            <input type="checkbox" checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} />
            Sim
          </label>
        </FormField>
        <FormField label="Início" required>
          <input type="datetime-local" className="app-input" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} required />
        </FormField>
        <FormField label="Fim (opcional)">
          <input type="datetime-local" className="app-input" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
        </FormField>
        <FormField label="Local">
          <input className="app-input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </FormField>
        <FormField label="Recorrência">
          <select className="app-input" value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as typeof form.recurrence }))}>
            <option value="NONE">Nenhuma</option>
            <option value="DAILY">Diária</option>
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensal</option>
          </select>
        </FormField>
        <FormField label="Descrição" full>
          <textarea className="app-input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>
        <FormField label="Notas privadas" full>
          <textarea className="app-input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </FormField>
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Salvando..." : "Criar evento"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  )
}
