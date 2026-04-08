"use client"

import { useState, useTransition } from "react"
import { Plus, Archive, CheckSquare, Clock, Circle, Ban, X, Loader2, ChevronDown } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { createTaskAction, updateTaskAction, archiveTaskAction, createSubtaskAction, toggleSubtaskAction } from "@/app/actions/task.actions"
import type { Area, TaskStatus, TaskPriority } from "@/types"
import type { TaskWithAreas } from "@/types"

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle size={15} className="text-cockpit-muted" />,
  IN_PROGRESS: <Clock size={15} className="text-amber-500" />,
  DONE: <CheckSquare size={15} className="text-emerald-500" />,
  CANCELLED: <Ban size={15} className="text-red-400" />,
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

interface Props {
  initialTasks: TaskWithAreas[]
  areas: Area[]
}

export function TasksClient({ initialTasks, areas }: Props) {
  const [tasks, setTasks] = useState<TaskWithAreas[]>(initialTasks)
  const [filter, setFilter] = useState<TaskStatus | "ALL">("ALL")
  const [showForm, setShowForm] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])
  const [estimatedMin, setEstimatedMin] = useState("")
  const [subtaskInput, setSubtaskInput] = useState("")

  const filtered = filter === "ALL"
    ? tasks.filter((t) => t.status !== "CANCELLED")
    : tasks.filter((t) => t.status === filter)

  function resetForm() {
    setTitle(""); setDescription(""); setPriority("MEDIUM")
    setDueDate(""); setSelectedAreaIds([]); setEstimatedMin("")
    setSubtaskInput(""); setShowForm(false)
  }

  function toggleArea(id: string) {
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

  function handleAddSubtask(taskId: string, title: string) {
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createSubtaskAction(taskId, title)
      if (result.success) {
        setTasks((prev) => prev.map((t) => t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, result.data as any] }
          : t
        ))
      }
    })
  }

  function handleToggleSubtask(taskId: string, subtaskId: string, done: boolean) {
    startTransition(async () => {
      const result = await toggleSubtaskAction(subtaskId, done)
      if (result.success) {
        setTasks((prev) => prev.map((t) => t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => s.id === subtaskId ? { ...s, done } : s) }
          : t
        ))
      }
    })
  }

  const filterCounts = {
    ALL: tasks.filter((t) => t.status !== "CANCELLED").length,
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
    CANCELLED: tasks.filter((t) => t.status === "CANCELLED").length,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Tarefas</h1>
          <p className="text-sm text-cockpit-muted mt-1">{filterCounts.ALL} tarefa{filterCounts.ALL !== 1 ? "s" : ""} ativas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> Nova Tarefa
        </button>
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
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
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
                    onClick={() => toggleArea(area.id)}
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

      {/* Filters */}
      <div className="flex items-center gap-1 bg-cockpit-border-light rounded-xl p-1 w-fit flex-wrap">
        {(["ALL", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === f ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text"
            )}
          >
            {f === "ALL" ? "Ativas" : STATUS_LABEL[f as TaskStatus]}
            <span className="ml-1.5 text-[10px] opacity-70">{filterCounts[f]}</span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
            <CheckSquare size={32} strokeWidth={1} />
            <p className="text-sm mt-3">Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          filtered.map((task) => (
            <div key={task.id} className={cn("cockpit-card !p-0 overflow-hidden", task.status === "CANCELLED" && "opacity-60")}>
              <div className="flex items-start gap-3 px-4 py-3.5">
                {/* Status dropdown */}
                <div className="relative group mt-0.5 flex-shrink-0">
                  <button className="flex items-center gap-1 p-0.5 rounded hover:bg-cockpit-surface-hover transition-colors">
                    {STATUS_ICON[task.status]}
                  </button>
                  <div className="absolute left-0 top-7 z-10 hidden group-hover:flex flex-col bg-cockpit-surface border border-cockpit-border rounded-xl shadow-lg overflow-hidden min-w-[150px]">
                    {(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(task, s)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-xs hover:bg-cockpit-surface-hover transition-colors text-left",
                          task.status === s ? "text-accent-dark font-medium" : "text-cockpit-muted"
                        )}
                      >
                        {STATUS_ICON[s]} {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium truncate", task.status === "DONE" ? "line-through text-cockpit-muted" : "text-cockpit-text")}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[11px] text-cockpit-muted mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", PRIORITY_COLOR[task.priority])}>
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                        {task.dueDate && (
                          <span className="text-[10px] text-cockpit-muted bg-cockpit-border-light px-2 py-0.5 rounded-full">
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.estimatedMin && (
                          <span className="text-[10px] text-cockpit-muted bg-cockpit-border-light px-2 py-0.5 rounded-full">
                            {task.estimatedMin}min
                          </span>
                        )}
                        {task.areas.map(({ area }) => (
                          <span
                            key={area.id}
                            className="text-[10px] px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: area.color }}
                          >
                            {area.icon} {area.name}
                          </span>
                        ))}
                        {task.subtasks.length > 0 && (
                          <span className="text-[10px] text-cockpit-muted">
                            {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtarefas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        className="p-1.5 text-cockpit-muted hover:text-cockpit-text rounded-lg hover:bg-cockpit-surface-hover transition-colors"
                      >
                        <ChevronDown size={14} className={cn("transition-transform", expandedTask === task.id && "rotate-180")} />
                      </button>
                      <button
                        onClick={() => handleArchive(task.id)}
                        className="p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
                        title="Arquivar"
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded subtasks */}
              {expandedTask === task.id && (
                <div className="border-t border-cockpit-border-light px-4 py-3 space-y-2 bg-cockpit-bg/40">
                  {task.subtasks.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={sub.done}
                        onChange={(e) => handleToggleSubtask(task.id, sub.id, e.target.checked)}
                        className="w-3.5 h-3.5 accent-accent rounded"
                      />
                      <span className={cn("text-xs flex-1", sub.done ? "line-through text-cockpit-muted" : "text-cockpit-text")}>
                        {sub.title}
                      </span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddSubtask(task.id, subtaskInput)
                          setSubtaskInput("")
                        }
                      }}
                      placeholder="Adicionar subtarefa (Enter)"
                      className="flex-1 px-2.5 py-1.5 bg-cockpit-bg border border-cockpit-border rounded-lg text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                    <button
                      onClick={() => { handleAddSubtask(task.id, subtaskInput); setSubtaskInput("") }}
                      className="p-1.5 text-accent rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
