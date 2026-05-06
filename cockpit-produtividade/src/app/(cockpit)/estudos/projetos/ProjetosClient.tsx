"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Plus, BookOpen, Clock, Target, TrendingUp, Archive, X,
  Loader2, ChevronRight, Library,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createStudyAction,
  updateStudyStatusAction,
  archiveStudyAction,
} from "@/app/actions/study.actions"
import type { Area, StudyStatus } from "@/types"
import { StudyDetailPanel } from "./StudyDetailPanel"

type StudyAreaRef = { id: string; name: string; color: string; icon: string }
export type StudyRow = {
  id: string
  title: string
  description?: string | null
  category: string
  link?: string | null
  totalHours: number
  doneHours: number
  status: StudyStatus
  createdAt: string | Date
  updatedAt: string | Date
  area?: StudyAreaRef | null
  areas?: { area: StudyAreaRef }[]
  _count?: { sessions: number }
}

export type StudyStats = {
  total: number
  notStarted: number
  inProgress: number
  completed: number
  paused: number
  totalDoneHours: number
  totalPlannedHours: number
  hoursLast7d: number
  hoursLast30d: number
  sessionsLast7d: number
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

const STATUS_ORDER: StudyStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "PAUSED"]

interface Props {
  initialStudies: StudyRow[]
  initialStats: StudyStats
  areas: Area[]
}

export function ProjetosClient({ initialStudies, initialStats, areas }: Props) {
  const [studies, setStudies] = useState<StudyRow[]>(initialStudies)
  const [stats, setStats] = useState<StudyStats>(initialStats)
  const [selected, setSelected] = useState<StudyRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<StudyStatus | "ALL">("ALL")
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [totalHours, setTotalHours] = useState("")
  const [link, setLink] = useState("")
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])
  const [formError, setFormError] = useState("")

  function resetForm() {
    setTitle("")
    setDescription("")
    setCategory("")
    setTotalHours("")
    setLink("")
    setSelectedAreaIds([])
    setFormError("")
    setShowForm(false)
  }

  function handleCreate() {
    if (!title.trim() || !category.trim()) {
      setFormError("Título e categoria são obrigatórios")
      return
    }
    setFormError("")
    startTransition(async () => {
      const result = await createStudyAction({
        title,
        description: description || undefined,
        category,
        totalHours: totalHours ? Number(totalHours) : 0,
        link: link || "",
        areaIds: selectedAreaIds,
      })
      if (result.success) {
        setStudies((prev) => [result.data as StudyRow, ...prev])
        resetForm()
      } else {
        setFormError(result.error ?? "Erro desconhecido")
      }
    })
  }

  function handleStatusChange(id: string, status: StudyStatus) {
    startTransition(async () => {
      const result = await updateStudyStatusAction(id, status)
      if (result.success) {
        setStudies((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
      }
    })
  }

  function handleArchive(id: string) {
    if (!confirm("Arquivar este projeto de estudo?")) return
    startTransition(async () => {
      const result = await archiveStudyAction(id)
      if (result.success) {
        setStudies((prev) => prev.filter((s) => s.id !== id))
        if (selected?.id === id) setSelected(null)
      }
    })
  }

  function handleDetailUpdate(updated: StudyRow) {
    setStudies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setSelected(updated)
  }

  const filtered = filter === "ALL" ? studies : studies.filter((s) => s.status === filter)
  const sorted = [...filtered].sort((a, b) => {
    const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    if (statusDiff !== 0) return statusDiff
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-cockpit-muted mb-1">
              <Link href="/estudos" className="hover:text-cockpit-text flex items-center gap-1">
                <Library size={12} /> Biblioteca
              </Link>
              <ChevronRight size={12} />
              <span>Projetos</span>
            </div>
            <h1 className="text-2xl font-bold text-cockpit-text">Projetos de Estudo</h1>
            <p className="text-sm text-cockpit-muted mt-1">
              {studies.length} projeto(s) — {stats.totalDoneHours.toFixed(1)}h estudadas no total
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
          >
            <Plus size={16} />
            Novo Projeto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<BookOpen size={18} />} label="Em progresso" value={stats.inProgress} />
          <StatCard icon={<Clock size={18} />} label="Horas últimos 7d" value={`${stats.hoursLast7d.toFixed(1)}h`} />
          <StatCard icon={<TrendingUp size={18} />} label="Horas últimos 30d" value={`${stats.hoursLast30d.toFixed(1)}h`} />
          <StatCard icon={<Target size={18} />} label="Completados" value={stats.completed} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["ALL", ...STATUS_ORDER] as const).map((f) => {
            const active = filter === f
            const count = f === "ALL" ? studies.length : studies.filter((s) => s.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  active
                    ? "bg-accent text-white"
                    : "bg-cockpit-border-light text-cockpit-muted hover:text-cockpit-text",
                )}
              >
                {f === "ALL" ? "Todos" : STATUS_LABEL[f]} ({count})
              </button>
            )
          })}
        </div>

        {/* New Project Form */}
        {showForm && (
          <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-cockpit-text">Novo Projeto de Estudo</h3>
              <button onClick={resetForm} className="text-cockpit-muted hover:text-cockpit-text">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Título *">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: The Rust Programming Language"
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label="Categoria *">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Linguagens, Comunicação, Idiomas"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Descrição">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Por que estudar isso? Qual o objetivo?"
                className={cn(inputCls, "resize-y")}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Horas planejadas (opcional)">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={totalHours}
                  onChange={(e) => setTotalHours(e.target.value)}
                  placeholder="Ex: 40"
                  className={inputCls}
                />
              </Field>
              <Field label="Link (opcional)">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>
            </div>

            {areas.length > 0 && (
              <Field label="Áreas">
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((a) => {
                    const selected = selectedAreaIds.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setSelectedAreaIds((prev) =>
                            prev.includes(a.id)
                              ? prev.filter((x) => x !== a.id)
                              : [...prev, a.id],
                          )
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                          selected
                            ? "bg-accent/10 text-accent-dark border-accent/30"
                            : "bg-cockpit-border-light text-cockpit-muted border-cockpit-border hover:text-cockpit-text",
                        )}
                      >
                        {a.icon} {a.name}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}

            {formError && (
              <p className="text-xs text-red-500">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-cockpit-muted hover:text-cockpit-text">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Criar projeto
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-cockpit-muted text-sm">
            {filter === "ALL"
              ? "📚 Nenhum projeto ainda. Adicione algo que você está estudando!"
              : `Nenhum projeto em "${STATUS_LABEL[filter as StudyStatus]}".`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((s) => (
              <StudyCard
                key={s.id}
                study={s}
                onClick={() => setSelected(s)}
                onStatusChange={(status) => handleStatusChange(s.id, status)}
                onArchive={() => handleArchive(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <StudyDetailPanel
          study={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleDetailUpdate}
        />
      )}
    </>
  )
}

function StudyCard({
  study,
  onClick,
  onStatusChange,
  onArchive,
}: {
  study: StudyRow
  onClick: () => void
  onStatusChange: (status: StudyStatus) => void
  onArchive: () => void
}) {
  const pct = study.totalHours > 0
    ? Math.min(100, Math.round((study.doneHours / study.totalHours) * 100))
    : null

  const studyAreas = study.areas?.map((sa) => sa.area) ?? (study.area ? [study.area] : [])

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-cockpit-text truncate">{study.title}</h3>
          <p className="text-xs text-cockpit-muted mt-0.5">{study.category}</p>
        </div>
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", STATUS_COLOR[study.status])}>
          {STATUS_LABEL[study.status]}
        </span>
      </div>

      {study.description && (
        <p className="text-sm text-cockpit-muted line-clamp-2 mb-3">{study.description}</p>
      )}

      {/* Progress */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs text-cockpit-muted">
          <span>{study.doneHours.toFixed(1)}h estudadas</span>
          {study.totalHours > 0 && (
            <span>de {study.totalHours.toFixed(1)}h ({pct}%)</span>
          )}
          {study.totalHours === 0 && <span>{study._count?.sessions ?? 0} sessões</span>}
        </div>
        {pct !== null && (
          <div className="h-1.5 bg-cockpit-border-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-1 flex-wrap">
          {studyAreas.slice(0, 2).map((a) => (
            <span key={a.id} className="text-[10px] text-cockpit-muted">
              {a.icon} {a.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <select
            value={study.status}
            onChange={(e) => onStatusChange(e.target.value as StudyStatus)}
            className="text-[11px] px-2 py-1 rounded-lg bg-cockpit-border-light text-cockpit-muted hover:text-cockpit-text border-none outline-none cursor-pointer"
          >
            {STATUS_ORDER.map((st) => (
              <option key={st} value={st}>{STATUS_LABEL[st]}</option>
            ))}
          </select>
          <button
            onClick={onArchive}
            title="Arquivar"
            className="p-1.5 rounded-lg text-cockpit-muted hover:text-red-500 hover:bg-red-500/10"
          >
            <Archive size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-3 flex items-center gap-3">
      <div className="text-accent">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-cockpit-muted uppercase tracking-wide truncate">{label}</div>
        <div className="text-lg font-bold text-cockpit-text">{value}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-cockpit-muted">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-cockpit-bg border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
