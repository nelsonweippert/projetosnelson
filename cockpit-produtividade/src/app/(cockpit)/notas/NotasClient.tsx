"use client"

import { useState, useTransition, useMemo } from "react"
import {
  Plus,
  Pin,
  Archive,
  X,
  Loader2,
  StickyNote,
  Search,
  Lightbulb,
  Notebook,
  Users,
  FileText,
  BookMarked,
  Star,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createNoteAction,
  archiveNoteAction,
  togglePinNoteAction,
  updateNoteAction,
} from "@/app/actions/note.actions"
import type { Area, NoteType } from "@/types"

type NoteAreaRef = { id: string; name: string; color: string; icon: string }
export type NoteRow = {
  id: string
  title: string | null
  content: string
  type: NoteType
  source: string | null
  date: string | Date
  isPinned: boolean
  createdAt: string | Date
  updatedAt: string | Date
  areas?: { area: NoteAreaRef }[]
  linkedTask?: { id: string; title: string; status: string } | null
  linkedEvent?: { id: string; title: string; date: string | Date } | null
  contact?: { id: string; name: string; company: string | null } | null
}

export type NoteStats = {
  total: number
  last7d: number
  byType: {
    free: number
    journal: number
    meeting: number
    idea: number
    referenceSummary: number
  }
}

const TYPE_LABEL: Record<NoteType, string> = {
  FREE: "Livre",
  JOURNAL: "Diário",
  MEETING: "Reunião",
  IDEA: "Ideia",
  REFERENCE_SUMMARY: "Resumo",
}

const TYPE_ICON: Record<NoteType, React.ElementType> = {
  FREE: StickyNote,
  JOURNAL: Notebook,
  MEETING: Users,
  IDEA: Lightbulb,
  REFERENCE_SUMMARY: BookMarked,
}

const TYPE_COLOR: Record<NoteType, string> = {
  FREE: "bg-cockpit-border-light text-cockpit-muted",
  JOURNAL: "bg-blue-500/10 text-blue-600",
  MEETING: "bg-purple-500/10 text-purple-600",
  IDEA: "bg-amber-500/10 text-amber-600",
  REFERENCE_SUMMARY: "bg-emerald-500/10 text-emerald-600",
}

interface Props {
  initialNotes: NoteRow[]
  initialStats: NoteStats
  areas: Area[]
}

export function NotasClient({ initialNotes, initialStats, areas }: Props) {
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes)
  const [stats] = useState<NoteStats>(initialStats)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NoteRow | null>(null)
  const [filterType, setFilterType] = useState<NoteType | "ALL">("ALL")
  const [filterAreaId, setFilterAreaId] = useState<string | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState<NoteType>("FREE")
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])
  const [formError, setFormError] = useState("")

  function resetForm() {
    setTitle("")
    setContent("")
    setType("FREE")
    setSelectedAreaIds([])
    setFormError("")
    setShowForm(false)
    setEditing(null)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(note: NoteRow) {
    setTitle(note.title ?? "")
    setContent(note.content)
    setType(note.type)
    setSelectedAreaIds(note.areas?.map((a) => a.area.id) ?? [])
    setEditing(note)
    setShowForm(true)
  }

  function handleSave() {
    if (!content.trim()) {
      setFormError("Conteúdo obrigatório")
      return
    }
    setFormError("")
    startTransition(async () => {
      const payload = {
        title: title || undefined,
        content,
        type,
        areaIds: selectedAreaIds,
      }
      const result = editing
        ? await updateNoteAction(editing.id, payload)
        : await createNoteAction(payload)
      if (result.success) {
        const note = result.data as NoteRow
        if (editing) {
          setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)))
        } else {
          setNotes((prev) => [note, ...prev])
        }
        resetForm()
      } else {
        setFormError(result.error ?? "Erro desconhecido")
      }
    })
  }

  function handlePin(id: string) {
    startTransition(async () => {
      const result = await togglePinNoteAction(id)
      if (result.success) {
        const updated = result.data as NoteRow
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
      }
    })
  }

  function handleArchive(id: string) {
    if (!confirm("Arquivar esta nota?")) return
    startTransition(async () => {
      const result = await archiveNoteAction(id)
      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id))
      }
    })
  }

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filterType !== "ALL" && n.type !== filterType) return false
      if (
        filterAreaId !== "ALL" &&
        !n.areas?.some((a) => a.area.id === filterAreaId)
      )
        return false
      if (search) {
        const q = search.toLowerCase()
        const inTitle = (n.title ?? "").toLowerCase().includes(q)
        const inContent = n.content.toLowerCase().includes(q)
        if (!inTitle && !inContent) return false
      }
      return true
    })
  }, [notes, filterType, filterAreaId, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [filtered])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Notas</h1>
          <p className="text-sm text-cockpit-muted mt-1">
            {stats.total} nota(s) — {stats.last7d} criadas nos últimos 7 dias
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          <Plus size={16} />
          Nova nota
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Livres" value={stats.byType.free} icon={<StickyNote size={16} />} />
        <StatCard label="Diário" value={stats.byType.journal} icon={<Notebook size={16} />} />
        <StatCard label="Reuniões" value={stats.byType.meeting} icon={<Users size={16} />} />
        <StatCard label="Ideias" value={stats.byType.idea} icon={<Lightbulb size={16} />} />
        <StatCard label="Resumos" value={stats.byType.referenceSummary} icon={<BookMarked size={16} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-cockpit-surface border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["ALL", "FREE", "JOURNAL", "MEETING", "IDEA", "REFERENCE_SUMMARY"] as const).map((t) => {
            const active = filterType === t
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  active
                    ? "bg-accent text-white"
                    : "bg-cockpit-border-light text-cockpit-muted hover:text-cockpit-text",
                )}
              >
                {t === "ALL" ? "Todas" : TYPE_LABEL[t]}
              </button>
            )
          })}
        </div>
        {areas.length > 0 && (
          <select
            value={filterAreaId}
            onChange={(e) => setFilterAreaId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-cockpit-surface border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
          >
            <option value="ALL">Todas as áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-cockpit-text">
              {editing ? "Editar nota" : "Nova nota"}
            </h3>
            <button
              onClick={resetForm}
              className="text-cockpit-muted hover:text-cockpit-text"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-cockpit-muted">Título (opcional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião com X, Reflexão da manhã..."
                className={inputCls}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-cockpit-muted">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NoteType)}
                className={inputCls}
              >
                <option value="FREE">Livre</option>
                <option value="JOURNAL">Diário</option>
                <option value="MEETING">Reunião</option>
                <option value="IDEA">Ideia</option>
                <option value="REFERENCE_SUMMARY">Resumo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-cockpit-muted">Conteúdo *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Markdown suportado..."
              className={cn(inputCls, "resize-y font-mono text-sm")}
            />
          </div>

          {areas.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-cockpit-muted">Áreas</label>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => {
                  const sel = selectedAreaIds.includes(a.id)
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
                        sel
                          ? "bg-accent/10 text-accent-dark border-accent/30"
                          : "bg-cockpit-border-light text-cockpit-muted border-cockpit-border hover:text-cockpit-text",
                      )}
                    >
                      {a.icon} {a.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-sm text-cockpit-muted hover:text-cockpit-text"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {editing ? "Salvar" : "Criar nota"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-cockpit-muted text-sm">
          {notes.length === 0
            ? "📝 Nenhuma nota ainda. Capture uma ideia, reflexão ou resumo!"
            : "Nenhuma nota corresponde aos filtros."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onClick={() => openEdit(n)}
              onPin={() => handlePin(n.id)}
              onArchive={() => handleArchive(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteCard({
  note,
  onClick,
  onPin,
  onArchive,
}: {
  note: NoteRow
  onClick: () => void
  onPin: () => void
  onArchive: () => void
}) {
  const Icon = TYPE_ICON[note.type] ?? FileText
  const noteAreas = note.areas?.map((na) => na.area) ?? []
  const date = new Date(note.date)
  const preview =
    note.content.length > 200 ? note.content.slice(0, 200) + "…" : note.content

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={cn(
              "p-1.5 rounded-lg flex-shrink-0",
              TYPE_COLOR[note.type],
            )}
          >
            <Icon size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-cockpit-text truncate">
              {note.title || preview.split("\n")[0].slice(0, 60) || "(sem título)"}
            </h3>
            <p className="text-[10px] text-cockpit-muted">
              {date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              {note.source && ` • ${note.source}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onPin}
            title={note.isPinned ? "Desafixar" : "Fixar"}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              note.isPinned
                ? "text-amber-500"
                : "text-cockpit-muted hover:text-amber-500",
            )}
          >
            {note.isPinned ? <Star size={14} fill="currentColor" /> : <Pin size={14} />}
          </button>
          <button
            onClick={onArchive}
            title="Arquivar"
            className="p-1.5 rounded-lg text-cockpit-muted hover:text-red-500 hover:bg-red-500/10"
          >
            <Archive size={14} />
          </button>
        </div>
      </div>

      <p className="text-sm text-cockpit-muted whitespace-pre-wrap line-clamp-4 mb-3">
        {preview}
      </p>

      {(noteAreas.length > 0 || note.contact) && (
        <div className="flex items-center gap-1 flex-wrap">
          {note.contact && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-dark border border-accent/20 flex items-center gap-1">
              <User size={10} /> {note.contact.name}
              {note.contact.company && (
                <span className="opacity-70">· {note.contact.company}</span>
              )}
            </span>
          )}
          {noteAreas.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className="text-[10px] px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted"
            >
              {a.icon} {a.name}
            </span>
          ))}
          {noteAreas.length > 3 && (
            <span className="text-[10px] text-cockpit-muted">
              +{noteAreas.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-3 flex items-center gap-3">
      <div className="text-accent">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-cockpit-muted uppercase tracking-wide truncate">
          {label}
        </div>
        <div className="text-lg font-bold text-cockpit-text">{value}</div>
      </div>
    </div>
  )
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-cockpit-bg border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
