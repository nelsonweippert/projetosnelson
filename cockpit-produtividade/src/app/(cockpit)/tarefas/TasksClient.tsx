"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  Plus, Archive, CheckSquare, Clock, Circle, Ban, X, Loader2,
  AlertTriangle, Search, SlidersHorizontal, ArrowUpDown, CalendarClock, Timer,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { createTaskAction, updateTaskAction, archiveTaskAction, createSubtaskAction, toggleSubtaskAction } from "@/app/actions/task.actions"
import type { Area, TaskStatus, TaskPriority } from "@/types"
import type { TaskWithAreas } from "@/types"
import { TaskDetailPanel } from "./TaskDetailPanel"
import { DatePicker } from "@/components/ui/DatePicker"

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle size={18} className="text-cockpit-muted" />,
  IN_PROGRESS: <Clock size={18} className="text-amber-500" />,
  DONE: <CheckSquare size={18} className="text-emerald-500" />,
  CANCELLED: <Ban size={18} className="text-red-400" />,
}

const STATUS_ICON_SM: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle size={12} className="text-cockpit-muted" />,
  IN_PROGRESS: <Clock size={12} className="text-amber-500" />,
  DONE: <CheckSquare size={12} className="text-emerald-500" />,
  CANCELLED: <Ban size={12} className="text-red-400" />,
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "bg-cockpit-border-light text-cockpit-muted",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  HIGH: "bg-red-500/10 text-red-500",
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
}

// ─── Due status ──────────────────────────────────────────────────────────────

type DueStatus = "overdue" | "today" | "soon" | "ok" | "none"

function getDueStatus(dueDate: Date | string | null | undefined, status: TaskStatus): DueStatus {
  if (!dueDate) return "none"
  if (status === "DONE" || status === "CANCELLED") return "ok"
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000)
  if (diffDays < 0) return "overdue"
  if (diffDays === 0) return "today"
  if (diffDays <= 2) return "soon"
  return "ok"
}

const DUE_LABEL: Record<DueStatus, string> = {
  overdue: "Atrasadas",
  today: "Vence hoje",
  soon: "Próximas",
  ok: "No prazo",
  none: "Sem prazo",
}

// ─── Sort ────────────────────────────────────────────────────────────────────

type SortKey = "created" | "dueDate" | "priority" | "title"
const SORT_LABEL: Record<SortKey, string> = {
  created: "Mais recentes",
  dueDate: "Por prazo",
  priority: "Por prioridade",
  title: "Alfabético",
}
const PRIORITY_ORDER: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function sortTasks(tasks: TaskWithAreas[], key: SortKey): TaskWithAreas[] {
  const sorted = [...tasks]
  switch (key) {
    case "created":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case "dueDate":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    case "priority":
      return sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
  }
}

// ─── Toggle helper ───────────────────────────────────────────────────────────

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  initialTasks: TaskWithAreas[]
  areas: Area[]
}

export function TasksClient({ initialTasks, areas }: Props) {
  const [tasks, setTasks] = useState<TaskWithAreas[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithAreas | null>(null)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [search, setSearch] = useState("")
  const [statusFilters, setStatusFilters] = useState<TaskStatus[]>([])
  const [priorityFilters, setPriorityFilters] = useState<TaskPriority[]>([])
  const [dueFilters, setDueFilters] = useState<DueStatus[]>([])
  const [areaFilters, setAreaFilters] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>("created")
  const [showFilters, setShowFilters] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])
  const [estimatedMin, setEstimatedMin] = useState("")

  const activeFilterCount = statusFilters.length + priorityFilters.length + dueFilters.length + areaFilters.length + (search ? 1 : 0)

  // Close dropdowns on outside click
  useEffect(() => {
    if (!statusDropdown && !sortOpen) return
    function onClick() { setStatusDropdown(null); setSortOpen(false) }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [statusDropdown, sortOpen])

  // ─── Filtering & sorting ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = tasks

    // Text search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      )
    }

    // Status
    if (statusFilters.length > 0) {
      result = result.filter((t) => statusFilters.includes(t.status))
    }

    // Priority
    if (priorityFilters.length > 0) {
      result = result.filter((t) => priorityFilters.includes(t.priority))
    }

    // Due status
    if (dueFilters.length > 0) {
      result = result.filter((t) => dueFilters.includes(getDueStatus(t.dueDate, t.status)))
    }

    // Areas
    if (areaFilters.length > 0) {
      result = result.filter((t) => t.areas.some(({ area }) => areaFilters.includes(area.id)))
    }

    return sortTasks(result, sortKey)
  }, [tasks, search, statusFilters, priorityFilters, dueFilters, areaFilters, sortKey])

  // ─── Counts ─────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const status: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0 }
    const prio: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
    const due: Record<DueStatus, number> = { overdue: 0, today: 0, soon: 0, ok: 0, none: 0 }
    const area: Record<string, number> = {}

    for (const t of tasks) {
      status[t.status]++
      prio[t.priority]++
      due[getDueStatus(t.dueDate, t.status)]++
      for (const { area: a } of t.areas) {
        area[a.id] = (area[a.id] || 0) + 1
      }
    }
    return { status, prio, due, area, total: tasks.length }
  }, [tasks])

  // ─── Handlers ───────────────────────────────────────────────────────────

  function resetForm() {
    setTitle(""); setDescription(""); setPriority("MEDIUM")
    setDueDate(""); setSelectedAreaIds([]); setEstimatedMin("")
    setShowForm(false)
  }

  function clearAllFilters() {
    setSearch(""); setStatusFilters([]); setPriorityFilters([])
    setDueFilters([]); setAreaFilters([]); setSortKey("created")
  }

  function toggleFormArea(id: string) {
    setSelectedAreaIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id])
  }

  function handleCreate() {
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createTaskAction({
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        areaIds: selectedAreaIds,
        estimatedMin: estimatedMin ? Number(estimatedMin) : null,
      })
      if (result.success) {
        setTasks((prev) => [result.data as TaskWithAreas, ...prev])
        resetForm()
      }
    })
  }

  function handleStatusChange(task: TaskWithAreas, status: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { status })
      if (result.success) {
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status } : t))
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveTaskAction(id)
      if (result.success) setTasks((prev) => prev.filter((t) => t.id !== id))
    })
  }

  function handlePanelUpdate(updated: TaskWithAreas) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
  }

  // ─── Quick preset shortcuts ─────────────────────────────────────────────

  function applyPreset(preset: "all" | "overdue" | "active" | "done") {
    clearAllFilters()
    switch (preset) {
      case "overdue":
        setDueFilters(["overdue"]); break
      case "active":
        setStatusFilters(["TODO", "IN_PROGRESS"]); break
      case "done":
        setStatusFilters(["DONE"]); break
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cockpit-text">Tarefas</h1>
            <p className="text-sm text-cockpit-muted mt-1">{counts.total} tarefa{counts.total !== 1 ? "s" : ""} no total</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} /> Nova Tarefa
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => applyPreset("active")} className={cn(
            "cockpit-card !py-3 text-left hover:border-accent/30 transition-colors",
            statusFilters.length === 2 && statusFilters.includes("TODO") && statusFilters.includes("IN_PROGRESS") && "!border-accent/40"
          )}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Ativas</p>
            <p className="text-2xl font-bold text-cockpit-text mt-1">{counts.status.TODO + counts.status.IN_PROGRESS}</p>
          </button>
          <button onClick={() => applyPreset("overdue")} className={cn(
            "cockpit-card !py-3 text-left transition-colors",
            counts.due.overdue > 0 ? "hover:border-red-500/40" : "hover:border-accent/30",
            dueFilters.length === 1 && dueFilters[0] === "overdue" && "!border-red-500/40"
          )}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1">
              {counts.due.overdue > 0 && <AlertTriangle size={11} className="text-red-400" />}
              Atrasadas
            </p>
            <p className={cn("text-2xl font-bold mt-1", counts.due.overdue > 0 ? "text-red-400" : "text-cockpit-text")}>{counts.due.overdue}</p>
          </button>
          <button onClick={() => { clearAllFilters(); setDueFilters(["today", "soon"]) }} className={cn(
            "cockpit-card !py-3 text-left hover:border-amber-500/30 transition-colors",
            dueFilters.includes("today") && dueFilters.includes("soon") && dueFilters.length === 2 && "!border-amber-500/40"
          )}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Vence em breve</p>
            <p className={cn("text-2xl font-bold mt-1", (counts.due.today + counts.due.soon) > 0 ? "text-amber-400" : "text-cockpit-text")}>{counts.due.today + counts.due.soon}</p>
          </button>
          <button onClick={() => applyPreset("done")} className={cn(
            "cockpit-card !py-3 text-left hover:border-emerald-500/30 transition-colors",
            statusFilters.length === 1 && statusFilters[0] === "DONE" && "!border-emerald-500/40"
          )}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Concluídas</p>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{counts.status.DONE}</p>
          </button>
        </div>

        {/* Search + filter toggle + sort */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefas..."
              className="w-full pl-9 pr-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm transition-colors",
              showFilters || activeFilterCount > 0
                ? "bg-accent/10 border-accent/30 text-accent"
                : "bg-cockpit-bg border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
            )}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-black text-[10px] font-bold rounded-full">{activeFilterCount}</span>
            )}
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setSortOpen((o) => !o) }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-muted hover:text-cockpit-text transition-colors"
            >
              <ArrowUpDown size={15} />
              <span className="hidden sm:inline">{SORT_LABEL[sortKey]}</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-12 z-50 bg-cockpit-surface border border-cockpit-border rounded-xl shadow-2xl overflow-hidden min-w-[170px]">
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={(e) => { e.stopPropagation(); setSortKey(k); setSortOpen(false) }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-cockpit-surface-hover transition-colors",
                      sortKey === k ? "text-accent font-medium" : "text-cockpit-muted"
                    )}
                  >
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
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-cockpit-muted hover:text-red-400 transition-colors">
                  Limpar todos
                </button>
              )}
            </div>

            {/* Status */}
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilters((f) => toggle(f, s))}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      statusFilters.includes(s)
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )}
                  >
                    {STATUS_ICON_SM[s]} {STATUS_LABEL[s]}
                    <span className="text-[10px] opacity-60">{counts.status[s]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Prioridade</p>
              <div className="flex flex-wrap gap-1.5">
                {(["HIGH", "MEDIUM", "LOW"] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilters((f) => toggle(f, p))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      priorityFilters.includes(p)
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )}
                  >
                    {PRIORITY_LABEL[p]}
                    <span className="ml-1 text-[10px] opacity-60">{counts.prio[p]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Due status */}
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2 flex items-center gap-1"><CalendarClock size={12} /> Prazo</p>
              <div className="flex flex-wrap gap-1.5">
                {(["overdue", "today", "soon", "ok", "none"] as DueStatus[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDueFilters((f) => toggle(f, d))}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      dueFilters.includes(d)
                        ? d === "overdue" ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : d === "today" ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                        : "border-accent/40 bg-accent/10 text-accent"
                        : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )}
                  >
                    {d === "overdue" && <AlertTriangle size={11} />}
                    {DUE_LABEL[d]}
                    <span className="text-[10px] opacity-60">{counts.due[d]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Areas */}
            {areas.length > 0 && (
              <div>
                <p className="text-[11px] text-cockpit-muted font-medium mb-2">Áreas</p>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => setAreaFilters((f) => toggle(f, area.id))}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        areaFilters.includes(area.id)
                          ? "border-transparent text-white"
                          : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                      )}
                      style={areaFilters.includes(area.id) ? { backgroundColor: area.color } : undefined}
                    >
                      {area.icon} {area.name}
                      <span className="text-[10px] opacity-70">{counts.area[area.id] || 0}</span>
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
                {STATUS_LABEL[s]}
                <button onClick={() => setStatusFilters((f) => f.filter((v) => v !== s))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
              </span>
            ))}
            {priorityFilters.map((p) => (
              <span key={p} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
                {PRIORITY_LABEL[p]}
                <button onClick={() => setPriorityFilters((f) => f.filter((v) => v !== p))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
              </span>
            ))}
            {dueFilters.map((d) => (
              <span key={d} className={cn(
                "flex items-center gap-1 px-2 py-1 border rounded-lg text-[11px]",
                d === "overdue" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-cockpit-surface border-cockpit-border text-cockpit-text"
              )}>
                {DUE_LABEL[d]}
                <button onClick={() => setDueFilters((f) => f.filter((v) => v !== d))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
              </span>
            ))}
            {areaFilters.map((id) => {
              const area = areas.find((a) => a.id === id)
              if (!area) return null
              return (
                <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white" style={{ backgroundColor: area.color }}>
                  {area.icon} {area.name}
                  <button onClick={() => setAreaFilters((f) => f.filter((v) => v !== id))} className="opacity-70 hover:opacity-100"><X size={10} /></button>
                </span>
              )
            })}
            <button onClick={clearAllFilters} className="text-[11px] text-cockpit-muted hover:text-red-400 ml-1">
              Limpar
            </button>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-cockpit-muted">
            {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && ` de ${counts.total}`}
          </p>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="cockpit-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cockpit-text">Nova Tarefa</h2>
              <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg">
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa *"
              className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-cockpit-muted mb-1.5">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-cockpit-muted mb-1.5">Prazo</label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
              <div>
                <label className="block text-xs text-cockpit-muted mb-1.5">Tempo estimado (min)</label>
                <input
                  type="number"
                  value={estimatedMin}
                  onChange={(e) => setEstimatedMin(e.target.value)}
                  placeholder="Ex: 30"
                  className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            {areas.length > 0 && (
              <div>
                <label className="block text-xs text-cockpit-muted mb-1.5">Áreas</label>
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleFormArea(area.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        selectedAreaIds.includes(area.id)
                          ? "border-transparent text-white"
                          : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                      )}
                      style={selectedAreaIds.includes(area.id) ? { backgroundColor: area.color } : {}}
                    >
                      <span>{area.icon}</span> {area.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || isPending}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Criar
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
              <CheckSquare size={32} strokeWidth={1} />
              <p className="text-sm mt-3">
                {activeFilterCount > 0 ? "Nenhuma tarefa encontrada com esses filtros" : "Nenhuma tarefa encontrada"}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-accent mt-2 hover:underline">Limpar filtros</button>
              )}
            </div>
          ) : (
            filtered.map((task) => {
              const dueStatus = getDueStatus(task.dueDate, task.status)
              return (
              <div key={task.id} className={cn(
                "cockpit-card !p-0 group/card transition-colors",
                task.status === "CANCELLED" && "opacity-60",
                dueStatus === "overdue" && "!border-red-500/40 bg-red-500/[0.03]",
                dueStatus === "today" && "!border-amber-500/40",
                dueStatus === "soon" && "!border-amber-400/20",
                dueStatus !== "overdue" && dueStatus !== "today" && dueStatus !== "soon" && "hover:border-accent/30",
              )}>
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Status dropdown */}
                  <div className="relative mt-0.5 flex-shrink-0">
                    <button
                      className="flex items-center gap-1 p-1 rounded-lg hover:bg-cockpit-surface-hover transition-colors"
                      onClick={(e) => { e.stopPropagation(); setStatusDropdown(statusDropdown === task.id ? null : task.id) }}
                    >
                      {STATUS_ICON[task.status]}
                    </button>
                    {statusDropdown === task.id && (
                      <div className="absolute left-0 top-9 z-50 flex flex-col bg-cockpit-surface border border-cockpit-border rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                        {(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task, s); setStatusDropdown(null) }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-cockpit-surface-hover transition-colors text-left",
                              task.status === s ? "text-accent-dark font-medium" : "text-cockpit-muted"
                            )}
                          >
                            {STATUS_ICON[s]} {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clickable content → opens panel */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <p className={cn("text-sm font-medium truncate hover:text-accent transition-colors", task.status === "DONE" ? "line-through text-cockpit-muted" : "text-cockpit-text")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-cockpit-muted mt-1 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", PRIORITY_COLOR[task.priority])}>
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                      {task.dueDate && (
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded-full flex items-center gap-1",
                          dueStatus === "overdue" && "bg-red-500/15 text-red-400 font-medium",
                          dueStatus === "today" && "bg-amber-500/15 text-amber-400 font-medium",
                          dueStatus === "soon" && "bg-amber-500/10 text-amber-500/80",
                          dueStatus !== "overdue" && dueStatus !== "today" && dueStatus !== "soon" && "bg-cockpit-border-light text-cockpit-muted",
                        )}>
                          {dueStatus === "overdue" && <AlertTriangle size={11} />}
                          {dueStatus === "overdue" ? "Atrasada" : dueStatus === "today" ? "Vence hoje" : formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.estimatedMin && (
                        <span className="text-xs text-cockpit-muted bg-cockpit-border-light px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Timer size={11} />{task.estimatedMin}min
                        </span>
                      )}
                      {task.areas.map(({ area }) => (
                        <span
                          key={area.id}
                          className="text-xs px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: area.color }}
                        >
                          {area.icon} {area.name}
                        </span>
                      ))}
                      {task.subtasks.length > 0 && (
                        <span className="text-xs text-cockpit-muted">
                          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtarefas
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(task.id) }}
                      className="p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
                      title="Arquivar"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          areas={areas}
          onClose={() => setSelectedTask(null)}
          onUpdate={handlePanelUpdate}
          onArchive={handleArchive}
        />
      )}
    </>
  )
}
