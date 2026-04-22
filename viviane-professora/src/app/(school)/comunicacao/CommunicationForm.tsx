"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { StudentPicker, type StudentOption } from "@/components/StudentPicker"
import { FormField, FormSection } from "@/components/FormField"
import { draftCommunicationAction, saveCommunicationAction } from "@/app/actions/communication.actions"

const TYPES = [
  { value: "NOTE", label: "📝 Bilhete" },
  { value: "EMAIL", label: "📧 E-mail" },
  { value: "WHATSAPP", label: "💬 WhatsApp" },
  { value: "MEETING", label: "🤝 Ata de reunião" },
  { value: "PHONE_CALL", label: "📞 Registro de ligação" },
  { value: "OTHER", label: "Outro" },
]

const TONES = [
  { value: "EMPATICO", label: "🤗 Empático" },
  { value: "INFORMATIVO", label: "ℹ️ Informativo" },
  { value: "FORMAL", label: "🎩 Formal" },
  { value: "ALERTA", label: "⚠️ Alerta" },
]

export function CommunicationForm({ students, initialStudentId }: { students: StudentOption[]; initialStudentId?: string }) {
  const router = useRouter()
  const [drafting, startDraft] = useTransition()
  const [saving, startSave] = useTransition()
  const [error, setError] = useState("")
  const [draft, setDraft] = useState<{ subject: string; body: string; tone: string; callToAction?: string } | null>(null)

  const [form, setForm] = useState({
    studentId: initialStudentId ?? "",
    type: "NOTE" as "NOTE" | "EMAIL" | "WHATSAPP" | "MEETING" | "PHONE_CALL" | "OTHER",
    tone: "EMPATICO" as "FORMAL" | "EMPATICO" | "INFORMATIVO" | "ALERTA",
    context: "",
  })

  const [review, setReview] = useState({ subject: "", body: "", toName: "", toContact: "" })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((f) => ({ ...f, [k]: v })) }

  function generate() {
    setError(""); setDraft(null)
    if (!form.context.trim()) { setError("Descreva o contexto da mensagem."); return }
    startDraft(async () => {
      const res = await draftCommunicationAction({
        studentId: form.studentId || null,
        type: form.type,
        tone: form.tone,
        context: form.context,
      })
      if (!res.success) { setError(res.error); return }
      const d = res.data as { subject: string; body: string; tone: string; callToAction?: string }
      setDraft(d)
      setReview({ subject: d.subject, body: d.body, toName: "", toContact: "" })
    })
  }

  function save(status: "DRAFT" | "SENT") {
    if (!draft) return
    setError("")
    startSave(async () => {
      const res = await saveCommunicationAction({
        studentId: form.studentId || null,
        type: form.type,
        subject: review.subject,
        body: review.body,
        toName: review.toName || null,
        toContact: review.toContact || null,
        tone: form.tone,
        status,
        generatedBy: "ai_edited",
      })
      if (!res.success) { setError(res.error); return }
      router.push("/comunicacao")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <FormSection title="Configurar mensagem">
        <FormField label="Aluno (opcional)">
          <StudentPicker students={students} value={form.studentId} onChange={(id) => set("studentId", id)} placeholder="Mensagem sem aluno específico" />
        </FormField>
        <FormField label="Tipo" required>
          <select className="app-input" value={form.type} onChange={(e) => set("type", e.target.value as typeof form.type)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Tom" required>
          <select className="app-input" value={form.tone} onChange={(e) => set("tone", e.target.value as typeof form.tone)}>
            {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>
        <FormField label="Contexto / o que você quer comunicar" required full hint="Seja específica. A IA vai escrever o rascunho a partir daqui.">
          <textarea className="app-input" rows={4} placeholder="Ex: Quero avisar os pais do Bruno que ele melhorou muito na concentração este mês. Sugerir continuar com as atividades de casa." value={form.context} onChange={(e) => set("context", e.target.value)} required />
        </FormField>
      </FormSection>

      {!draft && (
        <button type="button" onClick={generate} disabled={drafting} className="app-btn-primary w-full">
          {drafting ? "Gerando rascunho (15-30s)..." : "✨ Gerar rascunho com IA"}
        </button>
      )}

      {draft && (
        <>
          <FormSection title="Rascunho (edite antes de enviar)">
            <FormField label="Destinatário (nome)">
              <input className="app-input" value={review.toName} onChange={(e) => setReview((r) => ({ ...r, toName: e.target.value }))} />
            </FormField>
            <FormField label="Contato (e-mail/telefone)">
              <input className="app-input" value={review.toContact} onChange={(e) => setReview((r) => ({ ...r, toContact: e.target.value }))} />
            </FormField>
            <FormField label="Assunto" required full>
              <input className="app-input" value={review.subject} onChange={(e) => setReview((r) => ({ ...r, subject: e.target.value }))} required />
            </FormField>
            <FormField label="Corpo" required full>
              <textarea className="app-input" rows={10} value={review.body} onChange={(e) => setReview((r) => ({ ...r, body: e.target.value }))} required />
            </FormField>
            {draft.callToAction && (
              <FormField label="Call-to-action sugerido pela IA" full>
                <p className="text-sm italic text-app-muted" style={{ color: "var(--color-app-muted)" }}>{draft.callToAction}</p>
              </FormField>
            )}
          </FormSection>

          <div className="flex gap-2">
            <button type="button" onClick={() => save("SENT")} className="app-btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "✓ Marcar como enviado"}
            </button>
            <button type="button" onClick={() => save("DRAFT")} className="app-btn-ghost" disabled={saving}>
              Salvar rascunho
            </button>
            <button type="button" onClick={generate} className="app-btn-ghost" disabled={drafting}>
              Re-gerar
            </button>
          </div>
        </>
      )}

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
    </div>
  )
}
