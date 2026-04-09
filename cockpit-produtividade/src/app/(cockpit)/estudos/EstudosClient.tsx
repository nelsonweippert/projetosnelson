"use client"

import { useState, useTransition } from "react"
import { Plus, BookOpen, ExternalLink, Archive, X, Loader2, CheckCircle, Circle, BookMarked, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { createReferenceAction, updateReferenceStatusAction, archiveReferenceAction } from "@/app/actions/reference.actions"
import type { Area, ReferenceStatus, ReferenceType, ReferencePriority } from "@/types"

type Reference = {
  id: string
  title: string
  url: string
  source?: string | null
  type: ReferenceType
  status: ReferenceStatus
  priority: ReferencePriority
  tags: string[]
  plannedDate?: string | Date | null
  area?: { id: string; name: string; color: string; icon: string } | null
}

const STATUS_LABEL: Record<ReferenceStatus, string> = {
  UNREAD: "Para ler",
  READING: "Lendo",
  READ: "Lido",
  ARCHIVED: "Arquivado",
}

const STATUS_COLOR: Record<ReferenceStatus, string> = {
  UNREAD: "bg-cockpit-border-light text-cockpit-muted",
  READING: "bg-amber-500/10 text-amber-600",
  READ: "bg-emerald-500/10 text-emerald-600",
  ARCHIVED: "bg-cockpit-border-light text-cockpit-muted",
}

const TYPE_LABEL: Record<ReferenceType, string> = {
  VIDEO: "🎬 Vídeo",
  ARTICLE: "📄 Artigo",
  BLOG: "📝 Blog",
  PODCAST: "🎧 Podcast",
  DOCUMENT: "📋 Doc",
  OTHER: "🔗 Outro",
}

const PRIORITY_COLOR: Record<ReferencePriority, string> = {
  HIGH: "bg-red-500/10 text-red-500",
  NORMAL: "bg-cockpit-border-light text-cockpit-muted",
  LOW: "bg-cockpit-border-light text-cockpit-muted opacity-60",
}

interface Props {
  initialRefs: Reference[]
  areas: Area[]
}

export function EstudosClient({ initialRefs, areas }: Props) {
  const [refs, setRefs] = useState<Reference[]>(initialRefs)
  const [filter, setFilter] = useState<ReferenceStatus | "ALL">("ALL")
  const [typeFilter, setTypeFilter] = useState<ReferenceType | "ALL">("ALL")
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [source, setSource] = useState("")
  const [type, setType] = useState<ReferenceType>("ARTICLE")
  const [priority, setPriority] = useState<ReferencePriority>("NORMAL")
  const [areaId, setAreaId] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [plannedDate, setPlannedDate] = useState("")
  const [formError, setFormError] = useState("")

  const filtered = refs.filter((r) => {
    if (r.status === "ARCHIVED") return false
    if (filter !== "ALL" && r.status !== filter) return false
    if (typeFilter !== "ALL" && r.type !== typeFilter) return false
    return true
  })

  const counts = {
    ALL: refs.filter((r) => r.status !== "ARCHIVED").length,
    UNREAD: refs.filter((r) => r.status === "UNREAD").length,
    READING: refs.filter((r) => r.status === "READING").length,
    READ: refs.filter((r) => r.status === "READ").length,
  }

  function resetForm() {
    setTitle(""); setUrl(""); setSource(""); setType("ARTICLE")
    setPriority("NORMAL"); setAreaId(""); setTagInput(""); setTags([])
    setPlannedDate(""); setFormError("")
    setShowForm(false)
  }

  function addTag(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault()
      setTags((prev) => [...new Set([...prev, tagInput.trim()])])
      setTagInput("")
    }
  }

  function handleCreate() {
    if (!title.trim() || !url.trim()) return
    setFormError("")
    startTransition(async () => {
      const result = await createReferenceAction({
        title, url,
        source: source || undefined,
        type,
        priority,
        tags,
        areaId: areaId || null,
        plannedDate: plannedDate ? new Date(plannedDate).toISOString() : null,
      })
      if (result.success) {
        setRefs((prev) => [result.data as Reference, ...prev])
        resetForm()
      } else {
        setFormError(result.error ?? "Erro desconhecido")
      }
    })
  }

  function handleStatusChange(id: string, status: ReferenceStatus) {
    startTransition(async () => {
      const result = await updateReferenceStatusAction(id, status)
      if (result.success) {
        setRefs((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveReferenceAction(id)
      if (result.success) setRefs((prev) => prev.filter((r) => r.id !== id))
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Estudos</h1>
          <p className="text-sm text-cockpit-muted mt-1">Biblioteca de referências · {counts.ALL} itens</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cockpit-text">Nova Referência</h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg">
              <X size={16} />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título *"
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL *"
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Fonte</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ex: YouTube"
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as ReferenceType)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="ARTICLE">Artigo</option>
                <option value="VIDEO">Vídeo</option>
                <option value="BLOG">Blog</option>
                <option value="PODCAST">Podcast</option>
                <option value="DOCUMENT">Documento</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Prioridade</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as ReferencePriority)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Área</label>
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Nenhuma</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-cockpit-muted mb-1.5">
              <Calendar size={11} className="inline mr-1" />Planejar para (opcional)
            </label>
            <input
              type="datetime-local"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="block text-xs text-cockpit-muted mb-1.5">Tags (Enter para adicionar)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-dark">
                  {tag}
                  <button onClick={() => setTags((p) => p.filter((t) => t !== tag))}><X size={10} /></button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Ex: react, typescript..."
              className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl break-all">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !url.trim() || isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-cockpit-border-light rounded-xl p-1">
          {(["ALL", "UNREAD", "READING", "READ"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text")}>
              {f === "ALL" ? "Todos" : STATUS_LABEL[f as ReferenceStatus]}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[f as keyof typeof counts] ?? filtered.length}</span>
            </button>
          ))}
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ReferenceType | "ALL")}
          className="px-3 py-1.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-xs text-cockpit-text focus:outline-none">
          <option value="ALL">Todos os tipos</option>
          <option value="VIDEO">Vídeo</option>
          <option value="ARTICLE">Artigo</option>
          <option value="BLOG">Blog</option>
          <option value="PODCAST">Podcast</option>
          <option value="DOCUMENT">Documento</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
            <BookOpen size={32} strokeWidth={1} />
            <p className="text-sm mt-3">Nenhuma referência encontrada</p>
          </div>
        ) : (
          filtered.map((ref) => (
            <div key={ref.id} className="cockpit-card group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <a href={ref.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-cockpit-text hover:text-accent transition-colors flex items-center gap-1.5 group/link">
                      {ref.title}
                      <ExternalLink size={13} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-cockpit-muted">{TYPE_LABEL[ref.type]}</span>
                    {ref.source && <span className="text-xs text-cockpit-muted">· {ref.source}</span>}
                    {ref.priority === "HIGH" && (
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", PRIORITY_COLOR[ref.priority])}>
                        Prioritário
                      </span>
                    )}
                    {ref.area && (
                      <span className="text-xs px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: ref.area.color }}>
                        {ref.area.icon} {ref.area.name}
                      </span>
                    )}
                    {ref.plannedDate && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(ref.plannedDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    {ref.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent-dark">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status quick actions */}
                  <div className="relative group/status">
                    <span className={cn("text-xs font-medium px-3 py-1 rounded-full cursor-pointer", STATUS_COLOR[ref.status])}>
                      {STATUS_LABEL[ref.status]}
                    </span>
                    <div className="absolute right-0 top-8 z-10 hidden group-hover/status:flex flex-col bg-cockpit-surface border border-cockpit-border rounded-xl shadow-lg overflow-hidden min-w-[120px]">
                      {(["UNREAD", "READING", "READ"] as ReferenceStatus[]).map((s) => (
                        <button key={s} onClick={() => handleStatusChange(ref.id, s)}
                          className={cn("flex items-center gap-2 px-3 py-2 text-xs hover:bg-cockpit-surface-hover transition-colors text-left",
                            ref.status === s ? "text-accent-dark font-medium" : "text-cockpit-muted")}>
                          {s === "READ" ? <CheckCircle size={14} /> : s === "READING" ? <BookMarked size={14} /> : <Circle size={14} />}
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleArchive(ref.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all">
                    <Archive size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
