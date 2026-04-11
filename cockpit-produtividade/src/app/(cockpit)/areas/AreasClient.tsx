"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Plus, Archive, Layers, X, Loader2, ChevronLeft,
  CheckSquare, BookOpen, Video, DollarSign, Calendar, Clock, Circle, Ban,
  Search, SlidersHorizontal, AlertTriangle, ExternalLink, TrendingUp, TrendingDown,
} from "lucide-react"
import { cn, formatDate, formatCurrency } from "@/lib/utils"
import { createAreaAction, archiveAreaAction } from "@/app/actions/area.actions"
import type { Area } from "@/types"

const PRESET_COLORS = ["#00D6AB", "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B", "#10B981", "#EC4899", "#F97316"]
const PRESET_ICONS = ["📁", "💼", "🏃", "💰", "📚", "🎬", "🧠", "🎯", "🚀", "🌟", "💡", "🔥"]

type ItemKind = "task" | "reference" | "content" | "transaction" | "event"
const KIND_LABEL: Record<ItemKind, string> = { task: "Tarefas", reference: "Estudos", content: "Conteúdo", transaction: "Financeiro", event: "Eventos" }
const KIND_ICON: Record<ItemKind, React.ElementType> = { task: CheckSquare, reference: BookOpen, content: Video, transaction: DollarSign, event: Calendar }

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = any

interface AreaData {
  tasks: AnyItem[]
  references: AnyItem[]
  contents: AnyItem[]
  transactions: AnyItem[]
  calendarEvents: AnyItem[]
}

interface Props { initialAreas: Area[] }

export function AreasClient({ initialAreas }: Props) {
  const [areas, setAreas] = useState<Area[]>(initialAreas)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [areaData, setAreaData] = useState<AreaData | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Detail filters
  const [search, setSearch] = useState("")
  const [kindFilters, setKindFilters] = useState<ItemKind[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [color, setColor] = useState("#00D6AB")
  const [icon, setIcon] = useState("📁")
  const [description, setDescription] = useState("")

  function resetForm() { setName(""); setColor("#00D6AB"); setIcon("📁"); setDescription(""); setShowForm(false) }

  function handleCreate() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createAreaAction({ name, color, icon, description: description || undefined })
      if (result.success) { setAreas((prev) => [...prev, result.data as Area]); resetForm() }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveAreaAction(id)
      if (result.success) {
        setAreas((prev) => prev.filter((a) => a.id !== id))
        if (selectedArea?.id === id) { setSelectedArea(null); setAreaData(null) }
      }
    })
  }

  async function openArea(area: Area) {
    setSelectedArea(area)
    setAreaData(null)
    setSearch("")
    setKindFilters([])
    setShowFilters(false)
    setLoadingData(true)
    try {
      const res = await fetch(`/api/areas/${area.id}`)
      if (res.ok) setAreaData(await res.json())
    } catch { /* silent */ }
    setLoadingData(false)
  }

  // ── Detail view data ──────────────────────────────────────────────────

  const allItems = useMemo(() => {
    if (!areaData) return []
    const items: { kind: ItemKind; data: AnyItem; title: string; date: Date }[] = []
    for (const t of areaData.tasks) items.push({ kind: "task", data: t, title: t.title, date: new Date(t.createdAt) })
    for (const r of areaData.references) items.push({ kind: "reference", data: r, title: r.title, date: new Date(r.createdAt) })
    for (const c of areaData.contents) items.push({ kind: "content", data: c, title: c.title, date: new Date(c.createdAt) })
    for (const t of areaData.transactions) items.push({ kind: "transaction", data: t, title: t.description, date: new Date(t.date) })
    for (const e of areaData.calendarEvents) items.push({ kind: "event", data: e, title: e.title, date: new Date(e.date) })
    return items
  }, [areaData])

  const counts = useMemo(() => {
    const c: Record<ItemKind, number> = { task: 0, reference: 0, content: 0, transaction: 0, event: 0 }
    for (const item of allItems) c[item.kind]++
    return c
  }, [allItems])

  const financeSummary = useMemo(() => {
    if (!areaData) return { income: 0, expense: 0 }
    let income = 0, expense = 0
    for (const t of areaData.transactions) {
      if (t.type === "INCOME") income += t.amount; else expense += t.amount
    }
    return { income, expense }
  }, [areaData])

  const taskSummary = useMemo(() => {
    if (!areaData) return { todo: 0, inProgress: 0, done: 0, overdue: 0 }
    const now = new Date(); now.setHours(0, 0, 0, 0)
    let todo = 0, inProgress = 0, done = 0, overdue = 0
    for (const t of areaData.tasks) {
      if (t.status === "TODO") todo++
      else if (t.status === "IN_PROGRESS") inProgress++
      else if (t.status === "DONE") done++
      if (t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "CANCELLED") overdue++
    }
    return { todo, inProgress, done, overdue }
  }, [areaData])

  const activeFilterCount = kindFilters.length + (search ? 1 : 0)

  const filteredItems = useMemo(() => {
    let result = allItems
    if (search) { const q = search.toLowerCase(); result = result.filter((i) => i.title.toLowerCase().includes(q)) }
    if (kindFilters.length > 0) result = result.filter((i) => kindFilters.includes(i.kind))
    return result.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [allItems, search, kindFilters])

  function clearFilters() { setSearch(""); setKindFilters([]) }

  // ── Render item card ──────────────────────────────────────────────────

  function renderItem(item: { kind: ItemKind; data: AnyItem; title: string; date: Date }) {
    const KindIcon = KIND_ICON[item.kind]
    const now = new Date(); now.setHours(0, 0, 0, 0)

    if (item.kind === "task") {
      const t = item.data
      const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "CANCELLED"
      return (
        <div key={t.id + "task"} className={cn("flex items-start gap-3 p-3 rounded-xl border bg-cockpit-bg transition-colors", isOverdue ? "border-red-500/30" : "border-cockpit-border")}>
          {t.status === "DONE" ? <CheckSquare size={15} className="text-emerald-500 mt-0.5" /> : t.status === "IN_PROGRESS" ? <Clock size={15} className="text-amber-500 mt-0.5" /> : <Circle size={15} className="text-cockpit-muted mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", t.status === "DONE" ? "line-through text-cockpit-muted" : "text-cockpit-text")}>{t.title}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-cockpit-muted">
              <span>Tarefa</span>
              {t.dueDate && <span>{isOverdue ? <span className="text-red-400 flex items-center gap-0.5"><AlertTriangle size={9} /> Atrasada</span> : formatDate(t.dueDate)}</span>}
              {t.subtasks?.length > 0 && <span>{t.subtasks.filter((s: AnyItem) => s.done).length}/{t.subtasks.length} sub</span>}
            </div>
          </div>
        </div>
      )
    }

    if (item.kind === "reference") {
      const r = item.data
      return (
        <div key={r.id + "ref"} className="flex items-start gap-3 p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
          <BookOpen size={15} className="text-violet-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cockpit-text hover:text-accent truncate block">{r.title}</a>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-cockpit-muted">
              <span>Estudo</span>
              <span className={cn(r.status === "READ" ? "text-emerald-500" : r.status === "READING" ? "text-amber-500" : "")}>{r.status === "UNREAD" ? "Para ler" : r.status === "READING" ? "Lendo" : "Lido"}</span>
              {r.tags?.slice(0, 2).map((t: string) => <span key={t} className="px-1.5 py-0 rounded-full bg-accent/10 text-accent-dark">{t}</span>)}
            </div>
          </div>
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="p-1 text-cockpit-muted hover:text-accent"><ExternalLink size={13} /></a>
        </div>
      )
    }

    if (item.kind === "content") {
      const c = item.data
      const PHASE: Record<string, string> = { IDEA: "Ideia", SCRIPT: "Roteiro", RECORDING: "Gravando", EDITING: "Editando", REVIEW: "Revisão", SCHEDULED: "Agendado", PUBLISHED: "Publicado" }
      return (
        <div key={c.id + "content"} className="flex items-start gap-3 p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
          <Video size={15} className="text-pink-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-cockpit-text truncate">{c.title}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-cockpit-muted">
              <span>Conteúdo</span>
              <span className="px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-500">{PHASE[c.phase] || c.phase}</span>
              <span>{c.platform}</span>
            </div>
          </div>
        </div>
      )
    }

    if (item.kind === "transaction") {
      const t = item.data
      const isIncome = t.type === "INCOME"
      return (
        <div key={t.id + "txn"} className="flex items-start gap-3 p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
          {isIncome ? <TrendingUp size={15} className="text-emerald-500 mt-0.5" /> : <TrendingDown size={15} className="text-red-400 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-cockpit-text truncate">{t.description}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-cockpit-muted">
              <span>{t.category}</span>
              <span>{formatDate(t.date)}</span>
            </div>
          </div>
          <span className={cn("text-sm font-semibold", isIncome ? "text-emerald-500" : "text-red-400")}>{isIncome ? "+" : "-"}{formatCurrency(t.amount)}</span>
        </div>
      )
    }

    // event
    const e = item.data
    return (
      <div key={e.id + "ev"} className="flex items-start gap-3 p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
        <Calendar size={15} className="text-blue-500 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cockpit-text truncate">{e.title}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-cockpit-muted">
            <span>Evento</span>
            <span>{new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} {new Date(e.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            {e.location && <span>📍 {e.location}</span>}
          </div>
        </div>
      </div>
    )
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────

  if (selectedArea) {
    const total = allItems.length
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedArea(null); setAreaData(null) }} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: selectedArea.color + "20" }}>
              {selectedArea.icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-cockpit-text">{selectedArea.name}</h1>
              {selectedArea.description && <p className="text-sm text-cockpit-muted mt-0.5">{selectedArea.description}</p>}
            </div>
          </div>
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: selectedArea.color }} />
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-cockpit-muted" /></div>
        ) : areaData ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button onClick={() => { clearFilters(); setKindFilters(["task"]) }} className={cn("cockpit-card !py-3 text-left hover:border-emerald-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "task" && "!border-emerald-500/40")}>
                <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><CheckSquare size={11} /> Tarefas</p>
                <p className="text-2xl font-bold text-cockpit-text mt-1">{counts.task}</p>
                {taskSummary.overdue > 0 && <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-0.5"><AlertTriangle size={9} /> {taskSummary.overdue} atrasada{taskSummary.overdue !== 1 ? "s" : ""}</p>}
              </button>
              <button onClick={() => { clearFilters(); setKindFilters(["reference"]) }} className={cn("cockpit-card !py-3 text-left hover:border-violet-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "reference" && "!border-violet-500/40")}>
                <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><BookOpen size={11} /> Estudos</p>
                <p className="text-2xl font-bold text-violet-400 mt-1">{counts.reference}</p>
              </button>
              <button onClick={() => { clearFilters(); setKindFilters(["content"]) }} className={cn("cockpit-card !py-3 text-left hover:border-pink-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "content" && "!border-pink-500/40")}>
                <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><Video size={11} /> Conteúdo</p>
                <p className="text-2xl font-bold text-pink-400 mt-1">{counts.content}</p>
              </button>
              <button onClick={() => { clearFilters(); setKindFilters(["transaction"]) }} className={cn("cockpit-card !py-3 text-left hover:border-amber-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "transaction" && "!border-amber-500/40")}>
                <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><DollarSign size={11} /> Financeiro</p>
                <p className="text-lg font-bold mt-1">
                  <span className="text-emerald-400">{formatCurrency(financeSummary.income)}</span>
                  {financeSummary.expense > 0 && <span className="text-red-400 ml-2">-{formatCurrency(financeSummary.expense)}</span>}
                </p>
              </button>
              <button onClick={() => { clearFilters(); setKindFilters(["event"]) }} className={cn("cockpit-card !py-3 text-left hover:border-blue-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "event" && "!border-blue-500/40")}>
                <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><Calendar size={11} /> Eventos</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{counts.event}</p>
              </button>
            </div>

            {/* Task progress bar */}
            {counts.task > 0 && (
              <div className="cockpit-card !py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-cockpit-muted font-medium">Progresso de tarefas</p>
                  <p className="text-xs text-cockpit-muted">{taskSummary.done}/{counts.task} concluídas</p>
                </div>
                <div className="w-full h-2 bg-cockpit-border-light rounded-full overflow-hidden flex">
                  {taskSummary.done > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(taskSummary.done / counts.task) * 100}%` }} />}
                  {taskSummary.inProgress > 0 && <div className="h-full bg-amber-500 transition-all" style={{ width: `${(taskSummary.inProgress / counts.task) * 100}%` }} />}
                  {taskSummary.todo > 0 && <div className="h-full bg-cockpit-muted/30 transition-all" style={{ width: `${(taskSummary.todo / counts.task) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-cockpit-muted">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {taskSummary.done} Concluídas</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> {taskSummary.inProgress} Em andamento</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cockpit-muted/30" /> {taskSummary.todo} A fazer</span>
                </div>
              </div>
            )}

            {/* Search + filters */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nesta área..."
                  className="w-full pl-9 pr-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <button onClick={() => setShowFilters((f) => !f)} className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm transition-colors",
                showFilters || activeFilterCount > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-cockpit-bg border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
              )}>
                <SlidersHorizontal size={15} /> Filtros
                {activeFilterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-black text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="cockpit-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Filtrar por tipo</h3>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-cockpit-muted hover:text-red-400">Limpar</button>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["task", "reference", "content", "transaction", "event"] as ItemKind[]).map((k) => {
                    const Icon = KIND_ICON[k]
                    return (
                      <button key={k} onClick={() => setKindFilters((f) => toggle(f, k))} className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        kindFilters.includes(k) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                      )}>
                        <Icon size={12} /> {KIND_LABEL[k]} <span className="text-[10px] opacity-60">{counts[k]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Active filter tags */}
            {activeFilterCount > 0 && !showFilters && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-cockpit-muted mr-1">Filtros:</span>
                {kindFilters.map((k) => (
                  <span key={k} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
                    {KIND_LABEL[k]} <button onClick={() => setKindFilters((f) => f.filter((v) => v !== k))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-[11px] text-cockpit-muted hover:text-red-400 ml-1">Limpar</button>
              </div>
            )}

            {/* Results */}
            <p className="text-xs text-cockpit-muted">{filteredItems.length} ite{filteredItems.length !== 1 ? "ns" : "m"}{activeFilterCount > 0 && ` de ${total}`}</p>

            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
                  <Layers size={32} strokeWidth={1} />
                  <p className="text-sm mt-3">{activeFilterCount > 0 ? "Nenhum item com esses filtros" : "Nenhum item nesta área"}</p>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-accent mt-2 hover:underline">Limpar filtros</button>}
                </div>
              ) : filteredItems.map(renderItem)}
            </div>
          </>
        ) : null}
      </div>
    )
  }

  // ── AREAS LIST VIEW ───────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Áreas</h1>
          <p className="text-sm text-cockpit-muted mt-1">{areas.length} área{areas.length !== 1 ? "s" : ""} · classificam tarefas, finanças, conteúdo e estudos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors">
          <Plus size={16} /> Nova Área
        </button>
      </div>

      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cockpit-text">Nova Área</h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Nome *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Marketing, Saúde..." className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Descrição</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          </div>
          <div><label className="block text-xs text-cockpit-muted mb-1.5">Ícone</label><div className="flex flex-wrap gap-2">{PRESET_ICONS.map((i) => (<button key={i} onClick={() => setIcon(i)} className={cn("w-9 h-9 text-lg rounded-lg flex items-center justify-center border transition-all", icon === i ? "border-accent bg-accent/10" : "border-cockpit-border hover:border-cockpit-text/30")}>{i}</button>))}</div></div>
          <div><label className="block text-xs text-cockpit-muted mb-1.5">Cor</label><div className="flex flex-wrap gap-2">{PRESET_COLORS.map((c) => (<button key={c} onClick={() => setColor(c)} className={cn("w-8 h-8 rounded-full border-2 transition-all", color === c ? "border-cockpit-text scale-110" : "border-transparent hover:scale-105")} style={{ backgroundColor: c }} />))}</div></div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cockpit-bg border border-cockpit-border-light">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: color + "20" }}>{icon}</div>
            <div><p className="text-sm font-semibold text-cockpit-text">{name || "Nome da área"}</p>{description && <p className="text-xs text-cockpit-muted">{description}</p>}</div>
            <div className="ml-auto w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={!name.trim() || isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Criar
            </button>
          </div>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted"><Layers size={32} strokeWidth={1} /><p className="text-sm mt-3">Nenhuma área cadastrada</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => (
            <div key={area.id} className="cockpit-card group relative cursor-pointer hover:border-accent/30 transition-colors" onClick={() => openArea(area)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: area.color + "20" }}>{area.icon}</div>
                  <div><h3 className="text-sm font-semibold text-cockpit-text">{area.name}</h3>{area.description && <p className="text-xs text-cockpit-muted mt-0.5 line-clamp-1">{area.description}</p>}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleArchive(area.id) }} className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all" title="Arquivar"><Archive size={14} /></button>
              </div>
              <div className="mt-3 w-full h-1 rounded-full" style={{ backgroundColor: area.color + "40" }}><div className="h-full w-1/3 rounded-full" style={{ backgroundColor: area.color }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
