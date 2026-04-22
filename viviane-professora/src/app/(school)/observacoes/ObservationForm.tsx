"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { StudentPicker, type StudentOption } from "@/components/StudentPicker"
import { FormField, FormSection } from "@/components/FormField"
import { createObservationAction } from "@/app/actions/observation.actions"

const CATEGORIES = [
  { value: "BEHAVIOR", label: "Comportamento" },
  { value: "ACADEMIC", label: "Acadêmico" },
  { value: "SOCIAL", label: "Social" },
  { value: "EMOTIONAL", label: "Emocional" },
  { value: "HEALTH", label: "Saúde" },
  { value: "PARTICIPATION", label: "Participação" },
  { value: "OTHER", label: "Outro" },
]

const SENTIMENTS = [
  { value: "POSITIVE", label: "😊 Positivo" },
  { value: "NEUTRAL", label: "😐 Neutro" },
  { value: "CONCERN", label: "⚠️ Atenção" },
  { value: "URGENT", label: "🚨 Urgente" },
]

export function ObservationForm({ students, initialStudentId }: { students: StudentOption[]; initialStudentId?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [form, setForm] = useState<{
    studentId: string
    category: "BEHAVIOR" | "ACADEMIC" | "SOCIAL" | "EMOTIONAL" | "HEALTH" | "PARTICIPATION" | "OTHER"
    sentiment: "POSITIVE" | "NEUTRAL" | "CONCERN" | "URGENT"
    title: string
    note: string
    subject: string
    occurredAt: string
  }>({
    studentId: initialStudentId ?? "",
    category: "ACADEMIC",
    sentiment: "NEUTRAL",
    title: "",
    note: "",
    subject: "",
    occurredAt: new Date().toISOString().slice(0, 10),
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await createObservationAction(form)
      if (!res.success) { setError(res.error); return }
      router.push("/observacoes")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Observação">
        <FormField label="Aluno" required>
          <StudentPicker students={students} value={form.studentId} onChange={(id) => set("studentId", id)} required />
        </FormField>
        <FormField label="Data">
          <input type="date" className="app-input" value={form.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} />
        </FormField>
        <FormField label="Categoria" required>
          <select className="app-input" value={form.category} onChange={(e) => set("category", e.target.value as typeof form.category)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
        <FormField label="Sentimento">
          <select className="app-input" value={form.sentiment} onChange={(e) => set("sentiment", e.target.value as typeof form.sentiment)}>
            {SENTIMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>
        <FormField label="Matéria (opcional)">
          <input className="app-input" placeholder="Ex: Matemática, Português..." value={form.subject} onChange={(e) => set("subject", e.target.value)} />
        </FormField>
        <FormField label="Título" required full>
          <input className="app-input" placeholder="Ex: Leitura em voz alta" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </FormField>
        <FormField label="Observação" required full hint="A IA vai gerar resumo e tags automaticamente.">
          <textarea className="app-input" rows={5} placeholder="O que aconteceu hoje? Seja específica." value={form.note} onChange={(e) => set("note", e.target.value)} required />
        </FormField>
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Salvando (com IA)..." : "Salvar observação"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  )
}
