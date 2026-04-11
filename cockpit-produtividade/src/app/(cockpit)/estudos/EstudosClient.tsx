"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  Plus, BookOpen, ExternalLink, Archive, X, Loader2,
  CheckCircle, Circle, BookMarked, Calendar, Search,
  SlidersHorizontal, ArrowUpDown, AlertTriangle,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { createReferenceAction, updateReferenceStatusAction, archiveReferenceAction } from "@/app/actions/reference.actions"
import type { Area, ReferenceStatus, ReferenceType, ReferencePriority } from "@/types"
import { DatePicker } from "@/components/ui/DatePicker"
import { ReferenceDetailPanel } from "./ReferenceDetailPanel"

type Reference = {
  id: string
  title: string
  url: string
  source?: string | null
  type: ReferenceType
  status: ReferenceStatus
  priority: ReferencePriority
  tags: string[]
  comments?: string | null
  highlights?: string[]
  plannedDate?: string | Date | null
  createdAt: string | Date
  area?: { id: string; name: string; color: string; icon: string } | null
}

const STATUS_LABEL: Record<ReferenceStatus, string> = { UNREAD: "Para ler", READING: "Lendo", READ: "Lido", ARCHIVED: "Arquivado" }
const STATUS_COLOR: Record<ReferenceStatus, string> = {
  UNREAD: "bg-cockpit-border-light text-cockpit-muted",
  READING: "bg-amber-500/10 text-amber-600",
  READ: "bg-emerald-500/10 text-emerald-600",
  ARCHIVED: "bg-cockpit-border-light text-cockpit-muted",
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  UNREAD: <Circle size={12} className="text-cockpit-muted" />,
  READING: <BookMarked size={12} className="text-amber-500" />,
  READ: <CheckCircle size={12} className="text-emerald-500" />,
}

const TYPE_LABEL: Record<ReferenceType, string> = { VIDEO: "🎬 Vídeo", ARTICLE: "📄 Artigo", BLOG: "📝 Blog", PODCAST: "🎧 Podcast", DOCUMENT: "📋 Doc", OTHER: "🔗 Outro" }
const PRIORITY_COLOR: Record<ReferencePriority, string> = { HIGH: "bg-red-500/10 text-red-500", NORMAL: "bg-cockpit-border-light text-cockpit-muted", LOW: "bg-cockpit-border-light text-cockpit-muted opacity-60" }
const PRIORITY_LABEL: Record<ReferencePriority, string> = { HIGH: "Alta", NORMAL: "Normal", LOW: "Baixa" }

type SortKey = "created" | "priority" | "title" | "planned"
const SORT_LABEL: Record<SortKey, string> = { created: "Mais recentes", priority: "Por prioridade", title: "Alfabético", planned: "Por data planejada" }
const PRIORITY_ORDER: Record<ReferencePriority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 }

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

interface Props { initialRefs: Reference[]; areas: Area[] }

export function EstudosClient({ initialRefs, areas }: Props) {
  const [refs, setRefs] = useState<Reference[]>(initialRefs)
  const [selectedRef, setSelectedRef] = useState<Reference | null>(null)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Filters
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilters, setStatusFilters] = useState<ReferenceStatus[]>([])
  const [typeFilters, setTypeFilters] = useState<ReferenceType[]>([])
  const [priorityFilters, setPriorityFilters] = useState<ReferencePriority[]>([])
  const [areaFilters, setAreaFilters] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>("created")
  const [sortOpen, setSortOpen] = useState(false)

  // Form
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

  const activeFilterCount = statusFilters.length + typeFilters.length + priorityFilters.length + areaFilters.length + (search ? 1 : 0)

  useEffect(() => {
    if (!statusDropdown && !sortOpen) return
    function onClick() { setStatusDropdown(null); setSortOpen(false) }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [statusDropdown, sortOpen])

  // ── Counts ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const active = refs.filter((r) => r.status !== "ARCHIVED")
    const status: Record<string, number> = { UNREAD: 0, READING: 0, READ: 0 }
    const type: Record<string, number> = {}
    const prio: Record<string, number> = { HIGH: 0, NORMAL: 0, LOW: 0 }
    const area: Record<string, number> = {}
    for (const r of active) {
      status[r.status] = (status[r.status] || 0) + 1
      type[r.type] = (type[r.type] || 0) + 1
      prio[r.priority] = (prio[r.priority] || 0) + 1
      if (r.area) area[r.area.id] = (area[r.area.id] || 0) + 1
    }
    return { total: active.length, status, type, prio, area }
  }, [refs])

  // ── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = refs.filter((r) => r.status !== "ARCHIVED")
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((r) => r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)) || r.source?.toLowerCase().includes(q))
    }
    if (statusFilters.length > 0) result = result.filter((r) => statusFilters.includes(r.status))
    if (typeFilters.length > 0) result = result.filter((r) => typeFilters.includes(r.type))
    if (priorityFilters.length > 0) result = result.filter((r) => priorityFilters.includes(r.priority))
    if (areaFilters.length > 0) result = result.filter((r) => r.area && areaFilters.includes(r.area.id))

    const sorted = [...result]
    switch (sortKey) {
      case "created": sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case "priority": sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]); break
      case "title": sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR")); break
      case "planned": sorted.sort((a, b) => {
        if (!a.plannedDate && !b.plannedDate) return 0; if (!a.plannedDate) return 1; if (!b.plannedDate) return -1
        return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
      }); break
    }
    return sorted
  }, [refs, search, statusFilters, typeFilters, priorityFilters, areaFilters, sortKey])

  // ── Handlers ────────────────────────────────────────────────────────────

  function clearAllFilters() { setSearch(""); setStatusFilters([]); setTypeFilters([]); setPriorityFilters([]); setAreaFilters([]); setSortKey("created") }

  function resetForm() {
    setTitle(""); setUrl(""); setSource(""); setType("ARTICLE"); setPriority("NORMAL")
    setAreaId(""); setTagInput(""); setTags([]); setPlannedDate(""); setFormError(""); setShowForm(false)
  }

  function addTag(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault(); setTags((prev) => [...new Set([...prev, tagInput.trim()])]); setTagInput("")
    }
  }

  function handleCreate() {
    if (!title.trim() || !url.trim()) return
    setFormError("")
    startTransition(async () => {
      const result = await createReferenceAction({ title, url, source: source || undefined, type, priority, tags, areaId: areaId || null, plannedDate: plannedDate ? new Date(plannedDate).toISOString() : null })
      if (result.success) { setRefs((prev) => [result.data as Reference, ...prev]); resetForm() }
      else setFormError(result.error ?? "Erro desconhecido")
    })
  }

  function handleStatusChange(id: string, status: ReferenceStatus) {
    startTransition(async () => {
      const result = await updateReferenceStatusAction(id, status)
      if (result.success) setRefs((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
    })
    setStatusDropdown(null)
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveReferenceAction(id)
      if (result.success) setRefs((prev) => prev.filter((r) => r.id !== id))
    })
  }

  function handlePanelUpdate(updated: Reference) {
    setRefs((prev) => prev.map((r) => r.id === updated.id ? updated : r))
    setSelectedRef(updated)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cockpit-text">Estudos</h1>
            <p className="text-sm text-cockpit-muted mt-1">Biblioteca de referências · {counts.total} itens</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors">
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => { clearAllFilters(); setStatusFilters(["UNREAD"]) }} className={cn("cockpit-card !py-3 text-left hover:border-cockpit-text/20 transition-colors", statusFilters.length === 1 && statusFilters[0] === "UNREAD" && "!border-accent/40")}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Para ler</p>
            <p className="text-2xl font-bold text-cockpit-text mt-1">{counts.status.UNREAD || 0}</p>
          </button>
          <button onClick={() => { clearAllFilters(); setStatusFilters(["READING"]) }} className={cn("cockpit-card !py-3 text-left hover:border-amber-500/30 transition-colors", statusFilters.length === 1 && statusFilters[0] === "READING" && "!border-amber-500/40")}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Lendo</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{counts.status.READING || 0}</p>
          </button>
          <button onClick={() => { clearAllFilters(); setStatusFilters(["READ"]) }} className={cn("cockpit-card !py-3 text-left hover:border-emerald-500/30 transition-colors", statusFilters.length === 1 && statusFilters[0] === "READ" && "!border-emerald-500/40")}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Concluídos</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{counts.status.READ || 0}</p>
          </button>
          <button onClick={() => { clearAllFilters(); setPriorityFilters(["HIGH"]) }} className={cn("cockpit-card !py-3 text-left hover:border-red-500/30 transition-colors", priorityFilters.length === 1 && priorityFilters[0] === "HIGH" && "!border-red-500/40")}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Prioritários</p>
            <p className={cn("text-2xl font-bold mt-1", (counts.prio.HIGH || 0) > 0 ? "text-red-400" : "text-cockpit-text")}>{counts.prio.HIGH || 0}</p>
          </button>
        </div>

        {/* Search + filter toggle + sort */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar referências, tags..."
              className="w-full pl-9 pr-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <button onClick={() => setShowFilters((f) => !f)} className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm transition-colors",
            showFilters || activeFilterCount > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-cockpit-bg border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
          )}>
            <SlidersHorizontal size={15} /> Filtros
            {activeFilterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-black text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setSortOpen((o) => !o) }} className="flex items-center gap-1.5 px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-muted hover:text-cockpit-text transition-colors">
              <ArrowUpDown size={15} /><span className="hidden sm:inline">{SORT_LABEL[sortKey]}</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-12 z-50 bg-cockpit-surface border border-cockpit-border rounded-xl shadow-2xl overflow-hidden min-w-[170px]">
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <button key={k} onClick={(e) => { e.stopPropagation(); setSortKey(k); setSortOpen(false) }}
                    className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-cockpit-surface-hover transition-colors", sortKey === k ? "text-accent font-medium" : "text-cockpit-muted")}>
                    {SORT_LABEL[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="cockpit-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Filtros avançados</h3>
              {activeFilterCount > 0 && <button onClick={clearAllFilters} className="text-xs text-cockpit-muted hover:text-red-400 transition-colors">Limpar todos</button>}
            </div>
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {(["UNREAD", "READING", "READ"] as ReferenceStatus[]).map((s) => (
                  <button key={s} onClick={() => setStatusFilters((f) => toggle(f, s))} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    statusFilters.includes(s) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>{STATUS_ICON[s]} {STATUS_LABEL[s]} <span className="text-[10px] opacity-60">{counts.status[s] || 0}</span></button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Tipo</p>
              <div className="flex flex-wrap gap-1.5">
                {(["ARTICLE", "VIDEO", "BLOG", "PODCAST", "DOCUMENT", "OTHER"] as ReferenceType[]).map((t) => (
                  <button key={t} onClick={() => setTypeFilters((f) => toggle(f, t))} className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    typeFilters.includes(t) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>{TYPE_LABEL[t]} <span className="text-[10px] opacity-60">{counts.type[t] || 0}</span></button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Prioridade</p>
              <div className="flex flex-wrap gap-1.5">
                {(["HIGH", "NORMAL", "LOW"] as ReferencePriority[]).map((p) => (
                  <button key={p} onClick={() => setPriorityFilters((f) => toggle(f, p))} className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    priorityFilters.includes(p) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>{PRIORITY_LABEL[p]} <span className="text-[10px] opacity-60">{counts.prio[p] || 0}</span></button>
                ))}
              </div>
            </div>
            {areas.length > 0 && (
              <div>
                <p className="text-[11px] text-cockpit-muted font-medium mb-2">Áreas</p>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((area) => (
                    <button key={area.id} onClick={() => setAreaFilters((f) => toggle(f, area.id))} className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      areaFilters.includes(area.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )} style={areaFilters.includes(area.id) ? { backgroundColor: area.color } : undefined}>
                      {area.icon} {area.name} <span className="text-[10px] opacity-70">{counts.area[area.id] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active filter tags */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-cockpit-muted mr-1">Filtros:</span>
            {statusFilters.map((s) => (
              <span key={s} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
                {STATUS_LABEL[s]} <button onClick={() => setStatusFilters((f) => f.filter((v) => v !== s))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
              </span>
            ))}
            {typeFilters.map((t) => (
              <span key={t} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
                {TYPE_LABEL[t]} <button onClick={() => setTypeFilters((f) => f.filter((v) => v !== t))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
              </span>
            ))}
            {priorityFilters.map((p) => (
              <span key={p} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
                {PRIORITY_LABEL[p]} <button onClick={() => setPriorityFilters((f) => f.filter((v) => v !== p))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
              </span>
            ))}
            {areaFilters.map((id) => {
              const area = areas.find((a) => a.id === id); if (!area) return null
              return <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white" style={{ backgroundColor: area.color }}>
                {area.icon} {area.name} <button onClick={() => setAreaFilters((f) => f.filter((v) => v !== id))} className="opacity-70 hover:opacity-100"><X size={10} /></button>
              </span>
            })}
            <button onClick={clearAllFilters} className="text-[11px] text-cockpit-muted hover:text-red-400 ml-1">Limpar</button>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-cockpit-muted">{filtered.length} referência{filtered.length !== 1 ? "s" : ""}{activeFilterCount > 0 && ` de ${counts.total}`}</p>
        </div>

        {/* Form */}
        {showForm && (
          <div className="cockpit-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cockpit-text">Nova Referência</h2>
              <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg"><X size={16} /></button>
            </div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título *" className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL *" className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="block text-xs text-cockpit-muted mb-1.5">Fonte</label><input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex: YouTube" className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
              <div><label className="block text-xs text-cockpit-muted mb-1.5">Tipo</label><select value={type} onChange={(e) => setType(e.target.value as ReferenceType)} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="ARTICLE">Artigo</option><option value="VIDEO">Vídeo</option><option value="BLOG">Blog</option><option value="PODCAST">Podcast</option><option value="DOCUMENT">Documento</option><option value="OTHER">Outro</option></select></div>
              <div><label className="block text-xs text-cockpit-muted mb-1.5">Prioridade</label><select value={priority} onChange={(e) => setPriority(e.target.value as ReferencePriority)} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="HIGH">Alta</option><option value="NORMAL">Normal</option><option value="LOW">Baixa</option></select></div>
              <div><label className="block text-xs text-cockpit-muted mb-1.5">Área</label><select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="">Nenhuma</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</select></div>
            </div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5"><Calendar size={11} className="inline mr-1" />Planejar para (opcional)</label><DatePicker value={plannedDate} onChange={setPlannedDate} mode="datetime" /></div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Tags (Enter para adicionar)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">{tags.map((tag) => (<span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-dark">{tag}<button onClick={() => setTags((p) => p.filter((t) => t !== tag))}><X size={10} /></button></span>))}</div>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Ex: react, typescript..." className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            {formError && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl break-all">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={!title.trim() || !url.trim() || isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Salvar
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
              <BookOpen size={32} strokeWidth={1} />
              <p className="text-sm mt-3">{activeFilterCount > 0 ? "Nenhuma referência com esses filtros" : "Nenhuma referência encontrada"}</p>
              {activeFilterCount > 0 && <button onClick={clearAllFilters} className="text-xs text-accent mt-2 hover:underline">Limpar filtros</button>}
            </div>
          ) : (
            filtered.map((ref) => (
              <div key={ref.id} className="cockpit-card !p-0 group/card hover:border-accent/30 transition-colors">
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Status dropdown */}
                  <div className="relative mt-0.5 flex-shrink-0">
                    <button className="flex items-center gap-1 p-1 rounded-lg hover:bg-cockpit-surface-hover transition-colors"
                      onClick={(e) => { e.stopPropagation(); setStatusDropdown(statusDropdown === ref.id ? null : ref.id) }}>
                      {ref.status === "READ" ? <CheckCircle size={18} className="text-emerald-500" /> : ref.status === "READING" ? <BookMarked size={18} className="text-amber-500" /> : <Circle size={18} className="text-cockpit-muted" />}
                    </button>
                    {statusDropdown === ref.id && (
                      <div className="absolute left-0 top-9 z-50 flex flex-col bg-cockpit-surface border border-cockpit-border rounded-xl shadow-2xl overflow-hidden min-w-[140px]">
                        {(["UNREAD", "READING", "READ"] as ReferenceStatus[]).map((s) => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(ref.id, s) }}
                            className={cn("flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-cockpit-surface-hover transition-colors text-left",
                              ref.status === s ? "text-accent-dark font-medium" : "text-cockpit-muted")}>
                            {STATUS_ICON[s]} {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clickable content */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedRef(ref)}>
                    <p className={cn("text-sm font-medium truncate hover:text-accent transition-colors", ref.status === "READ" ? "line-through text-cockpit-muted" : "text-cockpit-text")}>
                      {ref.title}
                    </p>
                    {ref.source && <p className="text-xs text-cockpit-muted mt-0.5">{ref.source}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[11px] text-cockpit-muted">{TYPE_LABEL[ref.type]}</span>
                      {ref.priority === "HIGH" && <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", PRIORITY_COLOR.HIGH)}>Prioritário</span>}
                      {ref.area && <span className="text-xs px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: ref.area.color }}>{ref.area.icon} {ref.area.name}</span>}
                      {ref.plannedDate && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 flex items-center gap-1">
                          <Calendar size={11} />{new Date(ref.plannedDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                      {ref.tags.slice(0, 3).map((tag) => <span key={tag} className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent-dark">{tag}</span>)}
                      {ref.tags.length > 3 && <span className="text-[10px] text-cockpit-muted">+{ref.tags.length - 3}</span>}
                      {(ref.highlights?.length ?? 0) > 0 && <span className="text-[10px] text-amber-500">{ref.highlights!.length} destaques</span>}
                      {ref.comments && <span className="text-[10px] text-cockpit-muted">📝 Anotado</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-cockpit-muted hover:text-accent rounded-lg hover:bg-accent/10 transition-colors" title="Abrir link">
                      <ExternalLink size={16} />
                    </a>
                    <button onClick={(e) => { e.stopPropagation(); handleArchive(ref.id) }}
                      className="p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors" title="Arquivar">
                      <Archive size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRef && (
        <ReferenceDetailPanel
          reference={selectedRef}
          areas={areas}
          onClose={() => setSelectedRef(null)}
          onUpdate={handlePanelUpdate}
          onArchive={handleArchive}
        />
      )}
    </>
  )
}
