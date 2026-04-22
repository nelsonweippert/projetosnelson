"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FormField, FormSection } from "@/components/FormField"
import { generateLessonPlanAction } from "@/app/actions/lessonplan.actions"

const SUBJECTS = [
  "Língua Portuguesa", "Matemática", "Ciências", "História",
  "Geografia", "Artes", "Educação Física", "Inglês", "Outra",
]

export function LessonPlanForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    subject: "Língua Portuguesa",
    topic: "",
    duration: 50,
    date: new Date().toISOString().slice(0, 10),
    objectives: "",
    useWebSearch: true,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await generateLessonPlanAction(form)
      if (!res.success) { setError(res.error); return }
      const plan = res.data as { id: string }
      router.push(`/planos-aula/${plan.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Configurar plano">
        <FormField label="Matéria" required>
          <select className="app-input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Duração (min)" required>
          <input type="number" min={10} max={240} step={5} className="app-input" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 50 }))} required />
        </FormField>
        <FormField label="Data da aula" required full>
          <input type="date" className="app-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
        </FormField>
        <FormField label="Tema / assunto" required full hint="Ex: 'Multiplicação por 2 dígitos' ou 'Interpretação de fábulas'">
          <input className="app-input" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} required />
        </FormField>
        <FormField label="Objetivos prévios (opcional)" full hint="Se você já sabe o que quer atingir, descreva. Senão, a IA propõe.">
          <textarea className="app-input" rows={3} value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))} />
        </FormField>
        <FormField label="Pesquisar BNCC na web" full>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.useWebSearch} onChange={(e) => setForm((f) => ({ ...f, useWebSearch: e.target.checked }))} />
            Usar web_search + web_fetch para buscar códigos BNCC atualizados (mais lento, ~2min)
          </label>
        </FormField>
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? `Gerando (${form.useWebSearch ? "~2min com pesquisa" : "~30s"})...` : "✨ Gerar plano"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  )
}
