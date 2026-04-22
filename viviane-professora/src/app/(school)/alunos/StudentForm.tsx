"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createStudentAction, updateStudentAction } from "@/app/actions/student.actions"
import type { Student } from "@/types"

export function StudentForm({ student }: { student?: Student }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    fullName: student?.fullName ?? "",
    nickname: student?.nickname ?? "",
    birthDate: student?.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : "",
    classroom: student?.classroom ?? "",
    enrollmentId: student?.enrollmentId ?? "",
    guardian1Name: student?.guardian1Name ?? "",
    guardian1Phone: student?.guardian1Phone ?? "",
    guardian1Email: student?.guardian1Email ?? "",
    guardian2Name: student?.guardian2Name ?? "",
    guardian2Phone: student?.guardian2Phone ?? "",
    guardian2Email: student?.guardian2Email ?? "",
    learningStyle: student?.learningStyle ?? "",
    strengths: student?.strengths ?? "",
    challenges: student?.challenges ?? "",
    specialNeeds: student?.specialNeeds ?? "",
    medicalNotes: student?.medicalNotes ?? "",
  })

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const action = student
        ? updateStudentAction(student.id, form)
        : createStudentAction(form)
      const res = await action
      if (!res.success) {
        setError(res.error)
        return
      }
      const id = (res.data as Student).id
      router.push(`/alunos/${id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Identificação">
        <Field label="Nome completo *" required>
          <input className="app-input" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        </Field>
        <Field label="Apelido">
          <input className="app-input" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} />
        </Field>
        <Field label="Data de nascimento">
          <input type="date" className="app-input" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
        </Field>
        <Field label="Turma">
          <input className="app-input" placeholder="3º A" value={form.classroom} onChange={(e) => set("classroom", e.target.value)} />
        </Field>
        <Field label="Matrícula">
          <input className="app-input" value={form.enrollmentId} onChange={(e) => set("enrollmentId", e.target.value)} />
        </Field>
      </Section>

      <Section title="Responsável 1">
        <Field label="Nome"><input className="app-input" value={form.guardian1Name} onChange={(e) => set("guardian1Name", e.target.value)} /></Field>
        <Field label="Telefone"><input className="app-input" value={form.guardian1Phone} onChange={(e) => set("guardian1Phone", e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="app-input" value={form.guardian1Email} onChange={(e) => set("guardian1Email", e.target.value)} /></Field>
      </Section>

      <Section title="Responsável 2 (opcional)">
        <Field label="Nome"><input className="app-input" value={form.guardian2Name} onChange={(e) => set("guardian2Name", e.target.value)} /></Field>
        <Field label="Telefone"><input className="app-input" value={form.guardian2Phone} onChange={(e) => set("guardian2Phone", e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="app-input" value={form.guardian2Email} onChange={(e) => set("guardian2Email", e.target.value)} /></Field>
      </Section>

      <Section title="Perfil pedagógico">
        <Field label="Estilo de aprendizagem">
          <select className="app-input" value={form.learningStyle} onChange={(e) => set("learningStyle", e.target.value)}>
            <option value="">—</option>
            <option value="visual">Visual</option>
            <option value="auditivo">Auditivo</option>
            <option value="cinestesico">Cinestésico</option>
            <option value="misto">Misto</option>
          </select>
        </Field>
        <Field label="Pontos fortes" full>
          <textarea className="app-input" rows={2} value={form.strengths} onChange={(e) => set("strengths", e.target.value)} />
        </Field>
        <Field label="Dificuldades" full>
          <textarea className="app-input" rows={2} value={form.challenges} onChange={(e) => set("challenges", e.target.value)} />
        </Field>
        <Field label="Necessidades especiais" full>
          <input className="app-input" placeholder="TDAH, TEA, dislexia, altas habilidades..." value={form.specialNeeds} onChange={(e) => set("specialNeeds", e.target.value)} />
        </Field>
        <Field label="Observações médicas (sensível)" full>
          <textarea className="app-input" rows={2} placeholder="Alergias, medicamentos..." value={form.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} />
        </Field>
      </Section>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Salvando..." : student ? "Salvar" : "Criar aluno"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app-card">
      <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({ label, children, full, required }: { label: string; children: React.ReactNode; full?: boolean; required?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-medium text-app-muted mb-1" style={{ color: "var(--color-app-muted)" }}>
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}
