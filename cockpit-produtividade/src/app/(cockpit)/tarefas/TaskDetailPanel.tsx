"use client"

import { useState, useTransition, useRef } from "react"
import {
  X, CheckSquare, Clock, Circle, Ban, Plus, Loader2,
  Archive, Calendar, Timer, FileText, Paperclip, Save,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import {
  updateTaskAction,
  archiveTaskAction,
  createSubtaskAction,
  toggleSubtaskAction,
} from "@/app/actions/task.actions"
import type { TaskStatus, TaskPriority, Area } from "@/types"
import type { TaskWithAreas } from "@/types"

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  TODO: <Circle size={14} className="text-cockpit-muted" />,
  IN_PROGRESS: <Clock size={14} className="text-amber-500" />,
  DONE: <CheckSquare size={14} className="text-emerald-500" />,
  CANCELLED: <Ban size={14} className="text-red-400" />,
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30",
  IN_PROGRESS: "border-amber-400/40 bg-amber-500/5 text-amber-600",
  DONE: "border-emerald-400/40 bg-emerald-500/5 text-emerald-600",
  CANCELLED: "border-red-400/40 bg-red-500/5 text-red-500",
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "bg-cockpit-border-light text-cockpit-muted",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  HIGH: "bg-red-500/10 text-red-500",
}

interface Props {
  task: TaskWithAreas
  areas: Area[]
  onClose: () => void
  onUpdate: (task: TaskWithAreas) => void
  onArchive: (id: string) => void
}

export function TaskDetailPanel({ task, areas, onClose, onUpdate, onArchive }: Props) {
  const [isPending, startTransition] = useTransition()

  const [notes, setNotes] = useState(task.notes ?? "")
  const [description, setDescription] = useState(task.description ?? "")
  const [notesChanged, setNotesChanged] = useState(false)
  const [descChanged, setDescChanged] = useState(false)
  const [subtaskInput, setSubtaskInput] = useState("")
  const [localSubtasks, setLocalSubtasks] = useState(task.subtasks)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleStatusChange(status: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { status })
      if (result.success) onUpdate({ ...task, status, subtasks: localSubtasks })
    })
  }

  function handlePriorityChange(priority: TaskPriority) {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { priority })
      if (result.success) onUpdate({ ...task, priority, subtasks: localSubtasks })
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { notes })
      if (result.success) {
        onUpdate({ ...task, notes, subtasks: localSubtasks })
        setNotesChanged(false)
      }
    })
  }

  function handleSaveDescription() {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { description })
      if (result.success) {
        onUpdate({ ...task, description, subtasks: localSubtasks })
        setDescChanged(false)
      }
    })
  }

  function handleAddSubtask() {
    if (!subtaskInput.trim()) return
    const title = subtaskInput.trim()
    setSubtaskInput("")
    startTransition(async () => {
      const result = await createSubtaskAction(task.id, title)
      if (result.success) {
        setLocalSubtasks((prev) => [...prev, result.data as any])
      }
    })
  }

  function handleToggleSubtask(id: string, done: boolean) {
    setLocalSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, done } : s))
    startTransition(async () => {
      await toggleSubtaskAction(id, done)
    })
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveTaskAction(task.id)
      if (result.success) {
        onArchive(task.id)
        onClose()
      }
    })
  }

  const doneCount = localSubtasks.filter((s) => s.done).length

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-cockpit-surface border-l border-cockpit-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-cockpit-border">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-semibold text-cockpit-text leading-snug">{task.title}</h2>
            <p className="text-xs text-cockpit-muted mt-1">
              Criada em {formatDate(task.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleArchive}
              className="p-2 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
              title="Arquivar"
            >
              <Archive size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-cockpit-muted hover:text-cockpit-text rounded-lg hover:bg-cockpit-surface-hover transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status + Priority */}
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-xs text-cockpit-muted mb-2 font-medium">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      task.status === s ? STATUS_COLOR[s] : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )}
                  >
                    {STATUS_ICON[s]} {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-cockpit-muted mb-2 font-medium">Prioridade</p>
              <div className="flex gap-1.5">
                {(["LOW", "MEDIUM", "HIGH"] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      task.priority === p
                        ? PRIORITY_COLOR[p] + " border-transparent"
                        : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-xs text-cockpit-muted">
            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Prazo: {formatDate(task.dueDate)}</span>
              </div>
            )}
            {task.estimatedMin && (
              <div className="flex items-center gap-1.5">
                <Timer size={13} />
                <span>Estimado: {task.estimatedMin}min</span>
              </div>
            )}
            {task.areas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.areas.map(({ area }) => (
                  <span
                    key={area.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-white"
                    style={{ backgroundColor: area.color }}
                  >
                    {area.icon} {area.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5">
                <FileText size={13} /> Descrição
              </p>
              {descChanged && (
                <button
                  onClick={handleSaveDescription}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs text-accent-dark hover:text-accent transition-colors"
                >
                  <Save size={11} /> Salvar
                </button>
              )}
            </div>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setDescChanged(true) }}
              placeholder="Adicione uma descrição..."
              rows={3}
              className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5">
                <FileText size={13} /> Anotações
              </p>
              {notesChanged && (
                <button
                  onClick={handleSaveNotes}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs text-accent-dark hover:text-accent transition-colors"
                >
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Salvar
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesChanged(true) }}
              placeholder="Escreva anotações, links, referências..."
              rows={6}
              className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
            {notesChanged && (
              <p className="text-[11px] text-cockpit-muted mt-1">Alterações não salvas</p>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-cockpit-muted">
                Subtarefas {localSubtasks.length > 0 && `· ${doneCount}/${localSubtasks.length}`}
              </p>
              {localSubtasks.length > 0 && (
                <div className="w-24 h-1.5 bg-cockpit-border-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(doneCount / localSubtasks.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              {localSubtasks.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-cockpit-surface-hover transition-colors">
                  <input
                    type="checkbox"
                    checked={sub.done}
                    onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                    className="w-4 h-4 accent-accent rounded"
                  />
                  <span className={cn("text-sm flex-1", sub.done ? "line-through text-cockpit-muted" : "text-cockpit-text")}>
                    {sub.title}
                  </span>
                </label>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  placeholder="Nova subtarefa (Enter)"
                  className="flex-1 px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <button
                  onClick={handleAddSubtask}
                  className="p-2 text-accent rounded-xl hover:bg-accent/10 transition-colors border border-accent/20"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5 mb-3">
              <Paperclip size={13} /> Anexos
            </p>
            <input ref={fileInputRef} type="file" multiple className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-cockpit-border rounded-xl text-cockpit-muted hover:border-accent/40 hover:text-cockpit-text transition-colors"
            >
              <Paperclip size={20} strokeWidth={1.5} />
              <span className="text-xs">Clique para anexar arquivos</span>
              <span className="text-[11px] opacity-60">Integração de armazenamento em breve</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-cockpit-border bg-cockpit-bg/50">
          {(notesChanged || descChanged) && (
            <button
              onClick={() => { if (notesChanged) handleSaveNotes(); if (descChanged) handleSaveDescription() }}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar alterações
            </button>
          )}
          {!notesChanged && !descChanged && (
            <p className="text-center text-xs text-cockpit-muted">Todas as alterações salvas</p>
          )}
        </div>
      </div>
    </>
  )
}
