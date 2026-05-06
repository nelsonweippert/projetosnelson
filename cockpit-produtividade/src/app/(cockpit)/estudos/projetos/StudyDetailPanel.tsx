"use client"

import { useEffect, useState, useTransition } from "react"
import {
  X, Clock, Trash2, ExternalLink, Loader2, Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addStudySessionAction,
  deleteStudySessionAction,
} from "@/app/actions/study.actions"
import type { StudyStatus } from "@/types"
import type { StudyRow } from "./ProjetosClient"

type Session = {
  id: string
  hours: number
  note?: string | null
  date: string | Date
  createdAt: string | Date
}

const STATUS_LABEL: Record<StudyStatus, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em progresso",
  COMPLETED: "Completado",
  PAUSED: "Pausado",
}

const STATUS_COLOR: Record<StudyStatus, string> = {
  NOT_STARTED: "bg-cockpit-border-light text-cockpit-muted",
  IN_PROGRESS: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  PAUSED: "bg-blue-500/10 text-blue-600",
}

interface Props {
  study: StudyRow
  onClose: () => void
  onUpdated: (s: StudyRow) => void
}

export function StudyDetailPanel({ study, onClose, onUpdated }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Form
  const [hours, setHours] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/studies/${study.id}/sessions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [study.id])

  function handleAdd() {
    const h = Number(hours)
    if (!h || h < 0.25) {
      setError("Mínimo 0.25h (15 minutos)")
      return
    }
    setError("")
    startTransition(async () => {
      const result = await addStudySessionAction({
        studyId: study.id,
        hours: h,
        note: note || undefined,
      })
      if (result.success) {
        const session = result.data as Session
        setSessions((prev) => [session, ...prev])
        const newDone = study.doneHours + h
        const newStatus: StudyStatus =
          study.totalHours > 0 && newDone >= study.totalHours
            ? "COMPLETED"
            : study.status === "NOT_STARTED"
            ? "IN_PROGRESS"
            : study.status
        onUpdated({ ...study, doneHours: newDone, status: newStatus })
        setHours("")
        setNote("")
      } else {
        setError(result.error ?? "Erro desconhecido")
      }
    })
  }

  function handleDeleteSession(s: Session) {
    if (!confirm(`Remover sessão de ${s.hours}h?`)) return
    startTransition(async () => {
      const result = await deleteStudySessionAction(s.id)
      if (result.success) {
        setSessions((prev) => prev.filter((x) => x.id !== s.id))
        onUpdated({ ...study, doneHours: Math.max(0, study.doneHours - s.hours) })
      }
    })
  }

  const pct = study.totalHours > 0
    ? Math.min(100, Math.round((study.doneHours / study.totalHours) * 100))
    : null

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-cockpit-bg border-l border-cockpit-border h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-cockpit-bg/90 backdrop-blur-md border-b border-cockpit-border px-5 py-4 flex items-center justify-between">
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", STATUS_COLOR[study.status])}>
            {STATUS_LABEL[study.status]}
          </span>
          <button onClick={onClose} className="text-cockpit-muted hover:text-cockpit-text">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-cockpit-text">{study.title}</h2>
            <p className="text-xs text-cockpit-muted mt-0.5">{study.category}</p>
            {study.description && (
              <p className="text-sm text-cockpit-muted mt-2">{study.description}</p>
            )}
            {study.link && (
              <a
                href={study.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:underline"
              >
                <ExternalLink size={12} /> Abrir link
              </a>
            )}
          </div>

          {/* Progress */}
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-cockpit-muted">
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Progresso
              </span>
              <span>
                {study.doneHours.toFixed(1)}h
                {study.totalHours > 0 && ` / ${study.totalHours.toFixed(1)}h (${pct}%)`}
              </span>
            </div>
            {pct !== null && (
              <div className="h-2 bg-cockpit-border-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          {/* Add Session */}
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-cockpit-text flex items-center gap-1.5">
              <Plus size={14} /> Registrar sessão
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-cockpit-muted uppercase tracking-wide">Horas *</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="1.5"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-cockpit-muted uppercase tracking-wide">Notas</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="O que estudou? Pontos de bloqueio?"
                className={cn(inputCls, "resize-y")}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Registrar
            </button>
          </div>

          {/* Sessions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-cockpit-text">
              Sessões {sessions.length > 0 && <span className="text-cockpit-muted">({sessions.length})</span>}
            </h3>
            {loadingSessions ? (
              <p className="text-xs text-cockpit-muted">Carregando…</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-cockpit-muted">Nenhuma sessão ainda. Registre acima.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-cockpit-surface border border-cockpit-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <strong className="text-cockpit-text">{s.hours.toFixed(1)}h</strong>
                        <span className="text-[10px] text-cockpit-muted">
                          {new Date(s.date).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {s.note && (
                        <p className="text-xs text-cockpit-muted mt-1">{s.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSession(s)}
                      className="text-cockpit-muted hover:text-red-500 p-1"
                      title="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-cockpit-bg border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
