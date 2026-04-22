"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { StudentPicker, type StudentOption } from "@/components/StudentPicker"
import { FormField, FormSection } from "@/components/FormField"
import { RadarChart, RadarLegend } from "@/components/RadarChart"
import { ASSESSMENT_AXES, SCORE_LABEL } from "@/config/assessment-axes"
import { upsertWeeklyAssessmentAction } from "@/app/actions/weekly-assessment.actions"
import type { WeeklyAssessment } from "@/types"

type Scores = Record<string, number>

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return isoDate(d)
}
function weekLabel(dateStr: string) {
  const monday = new Date(mondayOf(dateStr))
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  const f = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
  return `${f(monday)} a ${f(sunday)}`
}

export function WeeklyAssessmentForm({
  students,
  initialStudentId,
  initialWeek,
  previous,
  existing,
}: {
  students: StudentOption[]
  initialStudentId?: string
  initialWeek?: string
  previous?: WeeklyAssessment | null
  existing?: WeeklyAssessment
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [studentId, setStudentId] = useState(existing?.studentId ?? initialStudentId ?? "")
  const [referenceWeek, setReferenceWeek] = useState(
    existing ? isoDate(new Date(existing.referenceWeek)) : initialWeek ?? mondayOf(isoDate(new Date())),
  )
  const [label, setLabel] = useState(existing?.label ?? "")

  const initialScores = useMemo<Scores>(() => {
    if (existing) return Object.fromEntries(ASSESSMENT_AXES.map((a) => [a.key, (existing as unknown as Record<string, number>)[a.field]]))
    return Object.fromEntries(ASSESSMENT_AXES.map((a) => [a.key, 3]))
  }, [existing])
  const [scores, setScores] = useState<Scores>(initialScores)

  const initialNotes = useMemo<Record<string, string>>(() => {
    const n: Record<string, string> = {}
    ASSESSMENT_AXES.forEach((a) => {
      n[a.key] = existing ? (((existing as unknown as Record<string, string | null>)[a.field + "Note"]) ?? "") : ""
    })
    return n
  }, [existing])
  const [notes, setNotes] = useState(initialNotes)

  const [highlight, setHighlight] = useState(existing?.highlight ?? "")
  const [concerns, setConcerns] = useState(existing?.concerns ?? "")

  const previousScores = useMemo<Scores | null>(() => {
    if (!previous) return null
    return Object.fromEntries(ASSESSMENT_AXES.map((a) => [a.key, (previous as unknown as Record<string, number>)[a.field]]))
  }, [previous])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!studentId) { setError("Selecione o aluno."); return }
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        studentId,
        referenceWeek,
        label: label || null,
        highlight: highlight || null,
        concerns: concerns || null,
      }
      ASSESSMENT_AXES.forEach((a) => {
        payload[a.field] = scores[a.key]
        payload[a.field + "Note"] = notes[a.key] || null
      })
      const res = await upsertWeeklyAssessmentAction(payload as Parameters<typeof upsertWeeklyAssessmentAction>[0])
      if (!res.success) { setError(res.error); return }
      router.push("/avaliacoes")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Identificação">
        <FormField label="Aluno" required>
          <StudentPicker students={students} value={studentId} onChange={setStudentId} required />
        </FormField>
        <FormField label="Data da semana (qualquer dia)" required hint={`Semana: ${weekLabel(referenceWeek)}`}>
          <input type="date" className="app-input" value={referenceWeek} onChange={(e) => setReferenceWeek(e.target.value)} required />
        </FormField>
        <FormField label="Rótulo (opcional)" full>
          <input className="app-input" placeholder={`Semana de ${weekLabel(referenceWeek)}`} value={label} onChange={(e) => setLabel(e.target.value)} />
        </FormField>
      </FormSection>

      <FormSection title={`Scores — semana ${weekLabel(referenceWeek)}`} cols={1}>
        <div className="space-y-2">
          {ASSESSMENT_AXES.map((axis) => (
            <div key={axis.key} className="pb-2 border-b last:border-b-0" style={{ borderColor: "var(--color-app-border-light)" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{axis.emoji} {axis.label}</div>
                  {previousScores && previousScores[axis.key] !== scores[axis.key] && (
                    <div className="text-[11px] font-semibold" style={{ color: previousScores[axis.key] < scores[axis.key] ? "#059669" : "#DC2626" }}>
                      ({previousScores[axis.key]} → {scores[axis.key]} {previousScores[axis.key] < scores[axis.key] ? "▲" : "▼"})
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setScores((s) => ({ ...s, [axis.key]: v }))}
                      className="w-8 h-8 rounded-lg text-sm font-bold border transition"
                      style={{
                        background: scores[axis.key] === v ? "var(--color-accent)" : "var(--color-app-surface)",
                        color: scores[axis.key] === v ? "#fff" : "var(--color-app-text)",
                        borderColor: scores[axis.key] === v ? "var(--color-accent)" : "var(--color-app-border)",
                      }}
                      title={SCORE_LABEL[v]}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="app-input text-xs mt-1"
                rows={1}
                placeholder={`Opcional — anotação sobre ${axis.label.toLowerCase()}`}
                value={notes[axis.key]}
                onChange={(e) => setNotes((n) => ({ ...n, [axis.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Destaques da semana" cols={1}>
        <FormField label="Destaque (o que foi bom)" full>
          <textarea className="app-input" rows={2} value={highlight} onChange={(e) => setHighlight(e.target.value)} />
        </FormField>
        <FormField label="Preocupação (se houver)" full>
          <textarea className="app-input" rows={2} value={concerns} onChange={(e) => setConcerns(e.target.value)} />
        </FormField>
      </FormSection>

      <FormSection title="Prévia do radar da semana" cols={1}>
        <div className="flex flex-col items-center">
          <RadarChart
            axes={ASSESSMENT_AXES}
            size={320}
            series={[
              ...(previousScores ? [{ label: "semana anterior", color: "#9CA3AF", data: previousScores, opacity: 0.15 }] : []),
              { label: weekLabel(referenceWeek), color: "#7C3AED", data: scores, opacity: 0.3 },
            ]}
          />
          <RadarLegend
            series={[
              ...(previousScores ? [{ label: "anterior", color: "#9CA3AF", data: previousScores }] : []),
              { label: "esta semana", color: "#7C3AED", data: scores },
            ]}
          />
        </div>
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Salvando..." : existing ? "Salvar alterações" : "Salvar semanal"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  )
}
