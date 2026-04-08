"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, CheckSquare, Clock, Circle, ChevronDown, X, Loader2, Tag } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { createTaskAction, updateTaskAction, deleteTaskAction } from "@/app/actions/task.actions"
import type { Task, TaskStatus, TaskPriority } from "@/types"

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle size={15} className="text-cockpit-muted" />,
  IN_PROGRESS: <Clock size={15} className="text-amber-500" />,
  DONE: <CheckSquare size={15} className="text-emerald-500" />,
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
  initialTasks: Task[]
}

export function TasksClient({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filter, setFilter] = useState<TaskStatus | "ALL">("ALL")
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const filtered = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter)

  function resetForm() {
    setTitle(""); setDescription(""); setPriority("MEDIUM")
    setDueDate(""); setTagInput(""); setTags([])
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
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createTaskAction({
        title, description, priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
      })
      if (result.success) {
        setTasks((prev) => [result.data as Task, ...prev])
        resetForm()
      }
    })
  }

  function handleStatusChange(task: Task, status: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { status })
      if (result.success) {
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status } : t))
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTaskAction(id)
      if (result.success) setTasks((prev) => prev.filter((t) => t.id !== id))
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Tarefas</h1>
          <p className="text-sm text-cockpit-muted mt-1">{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} no total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      {/* Form */}
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

          <div className="grid grid-cols-2 gap-3">
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
              placeholder="Ex: trabalho, pessoal..."
              className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

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

      {/* Filtros */}
      <div className="flex items-center gap-1 bg-cockpit-border-light rounded-xl p-1 w-fit">
        {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === f ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text"
            )}
          >
            {f === "ALL" ? "Todas" : STATUS_LABEL[f as TaskStatus]}
            <span className="ml-1.5 text-[10px] opacity-70">
              {f === "ALL" ? tasks.length : tasks.filter((t) => t.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="cockpit-card !p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-cockpit-muted">
            <CheckSquare size={32} strokeWidth={1} />
            <p className="text-sm mt-3">Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-cockpit-border">
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3">Tarefa</th>
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3 hidden sm:table-cell">Prioridade</th>
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3 hidden md:table-cell">Prazo</th>
                <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-b border-cockpit-border-light hover:bg-cockpit-surface-hover transition-colors">
                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <div className="relative group w-fit">
                      <button className="flex items-center gap-1.5">
                        {STATUS_ICON[task.status]}
                      </button>
                      <div className="absolute left-0 top-7 z-10 hidden group-hover:flex flex-col bg-cockpit-surface border border-cockpit-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                        {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((s) => (
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
                  </td>

                  {/* Título */}
                  <td className="px-3 py-3.5">
                    <p className={cn("text-sm font-medium", task.status === "DONE" ? "line-through text-cockpit-muted" : "text-cockpit-text")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-cockpit-muted mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {task.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent-dark flex items-center gap-0.5">
                            <Tag size={8} />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Prioridade */}
                  <td className="px-3 py-3.5 hidden sm:table-cell">
                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", PRIORITY_COLOR[task.priority])}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                  </td>

                  {/* Prazo */}
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-cockpit-muted">
                      {task.dueDate ? formatDate(task.dueDate) : "—"}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 text-cockpit-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
