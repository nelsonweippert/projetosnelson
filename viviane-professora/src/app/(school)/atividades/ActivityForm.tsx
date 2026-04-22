"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FormField, FormSection } from "@/components/FormField"
import { generateActivityAction } from "@/app/actions/activity.actions"

const SUBJECTS = ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Artes", "Inglês"]
const TYPES = [
  { value: "EXERCISE", label: "Lista de exercícios" },
  { value: "ASSESSMENT", label: "Avaliação / prova" },
  { value: "PROJECT", label: "Projeto" },
  { value: "GAME", label: "Jogo / dinâmica" },
  { value: "READING", label: "Leitura" },
  { value: "WRITING", label: "Produção textual" },
  { value: "OTHER", label: "Outro" },
]
const DIFFICULTIES = [
  { value: "EASY", label: "Fácil (revisão)" },
  { value: "MEDIUM", label: "Média (aplicação)" },
  { value: "HARD", label: "Difícil (transferência)" },
]

export function ActivityForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    title: "",
    subject: "Matemática",
    topic: "",
    type: "EXERCISE" as "EXERCISE" | "ASSESSMENT" | "PROJECT" | "GAME" | "READING" | "WRITING" | "OTHER",
    difficulty: "MEDIUM" as "EASY" | "MEDIUM" | "HARD",
    count: 5,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await generateActivityAction(form)
      if (!res.success) { setError(res.error); return }
      const act = res.data as { id: string }
      router.push(`/atividades/${act.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Configurar atividade">
        <FormField label="Título" required full>
          <input className="app-input" placeholder="Ex: Lista de multiplicação — nível intermediário" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </FormField>
        <FormField label="Matéria" required>
          <select className="app-input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Tipo" required>
          <select className="app-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Tópico" required full hint="Ex: 'Multiplicação por dois dígitos'">
          <input className="app-input" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} required />
        </FormField>
        <FormField label="Dificuldade">
          <select className="app-input" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))}>
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </FormField>
        <FormField label="Quantidade de questões">
          <input type="number" min={1} max={30} className="app-input" value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: parseInt(e.target.value) || 5 }))} />
        </FormField>
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Gerando (~30s)..." : "✨ Gerar atividade"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  )
}
