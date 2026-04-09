"use client"

import { useState, useTransition } from "react"
import {
  ChevronLeft, ChevronRight, Plus, X, Archive,
  MapPin, Users, FileText, Loader2, Calendar,
  CheckSquare, Zap, Coffee, BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  archiveCalendarEventAction,
} from "@/app/actions/calendar.actions"
import type { CalendarEventWithArea, TaskWithDue, Area } from "@/types"

type EventType = "MEETING" | "ATA" | "ACTION" | "GENERAL"

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  MEETING: "Reunião",
  ATA: "Ata",
  ACTION: "Ação",
  GENERAL: "Geral",
}

const EVENT_TYPE_COLOR: Record<EventType, string> = {
  MEETING: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  ATA: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  ACTION: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  GENERAL: "bg-accent/15 text-accent-dark border-accent/20",
}

const EVENT_TYPE_DOT: Record<EventType, string> = {
  MEETING: "bg-blue-500",
  ATA: "bg-purple-500",
  ACTION: "bg-amber-500",
  GENERAL: "bg-accent",
}

const EVENT_TYPE_ICON: Record<EventType, React.ElementType> = {
  MEETING: Users,
  ATA: FileText,
  ACTION: Zap,
  GENERAL: Coffee,
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// ─── Types ───────────────────────────────────────────────────────────────────

type DayItem =
  | { kind: "event"; data: CalendarEventWithArea }
  | { kind: "task"; data: TaskWithDue }

interface Props {
  initialEvents: CalendarEventWithArea[]
  initialTasks: TaskWithDue[]
  areas: Area[]
  initialYear: number
  initialMonth: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CalendarioClient({ initialEvents, initialTasks, areas, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [events, setEvents] = useState<CalendarEventWithArea[]>(initialEvents)
  const [tasks] = useState<TaskWithDue[]>(initialTasks)
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithArea | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [formError, setFormError] = useState("")

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formType, setFormType] = useState<EventType>("GENERAL")
  const [formDate, setFormDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formAttendees, setFormAttendees] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formAreaId, setFormAreaId] = useState("")

  // ── Calendar grid helpers ──────────────────────────────────────────────────

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  function getItemsForDay(day: number): DayItem[] {
    const items: DayItem[] = []
    for (const ev of events) {
      const d = new Date(ev.date)
      if (d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year) {
        items.push({ kind: "event", data: ev })
      }
    }
    for (const t of tasks) {
      if (!t.dueDate) continue
      const d = new Date(t.dueDate)
      if (d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year) {
        items.push({ kind: "task", data: t })
      }
    }
    return items
  }

  function getSelectedDayItems(): DayItem[] {
    if (!selectedDay) return []
    return getItemsForDay(selectedDay)
  }

  // ── Month navigation ───────────────────────────────────────────────────────

  async function navigateMonth(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear++ }
    if (newMonth < 1) { newMonth = 12; newYear-- }
    setIsLoadingMonth(true)
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDay(null)
    try {
      const res = await fetch(`/api/calendar?year=${newYear}&month=${newMonth}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events ?? [])
      }
    } catch { /* fallback silently */ }
    setIsLoadingMonth(false)
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  function openCreateForm(day?: number) {
    resetForm()
    setFormError("")
    if (day) {
      const d = new Date(year, month - 1, day)
      const iso = d.toISOString().slice(0, 16)
      setFormDate(iso)
    }
    setShowForm(true)
    setEditingEvent(null)
  }

  function toLocalInput(date: Date | string): string {
    const d = new Date(date)
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 16)
  }

  function openEditForm(ev: CalendarEventWithArea) {
    setEditingEvent(ev)
    setFormTitle(ev.title)
    setFormType(ev.type)
    setFormDate(toLocalInput(ev.date))
    setFormEndDate(ev.endDate ? toLocalInput(ev.endDate) : "")
    setFormDescription(ev.description ?? "")
    setFormLocation(ev.location ?? "")
    setFormAttendees(ev.attendees.join(", "))
    setFormNotes(ev.notes ?? "")
    setFormAreaId(ev.areaId ?? "")
    setShowForm(true)
  }

  function resetForm() {
    setFormTitle(""); setFormType("GENERAL"); setFormDate(""); setFormEndDate("")
    setFormDescription(""); setFormLocation(""); setFormAttendees(""); setFormNotes("")
    setFormAreaId(""); setShowForm(false); setEditingEvent(null)
  }

  function handleSubmit() {
    if (!formTitle.trim() || !formDate) return
    const payload = {
      title: formTitle.trim(),
      type: formType,
      date: new Date(formDate).toISOString(),
      endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
      description: formDescription || undefined,
      location: formLocation || undefined,
      attendees: formAttendees ? formAttendees.split(",").map((s) => s.trim()).filter(Boolean) : [],
      notes: formNotes || undefined,
      areaId: formAreaId || null,
    }

    setFormError("")
    startTransition(async () => {
      if (editingEvent) {
        const res = await updateCalendarEventAction(editingEvent.id, payload)
        if (res.success) {
          setEvents((prev) => prev.map((e) => e.id === editingEvent.id ? res.data as CalendarEventWithArea : e))
          resetForm()
        } else {
          setFormError(res.error ?? "Erro ao atualizar evento")
        }
      } else {
        const res = await createCalendarEventAction(payload)
        if (res.success) {
          setEvents((prev) => [...prev, res.data as CalendarEventWithArea])
          resetForm()
        } else {
          setFormError(res.error ?? "Erro ao criar evento")
        }
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const res = await archiveCalendarEventAction(id)
      if (res.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id))
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedItems = getSelectedDayItems()

  const formattedSelectedDay = selectedDay
    ? new Date(year, month - 1, selectedDay).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Calendário</h1>
          <p className="text-sm text-cockpit-muted mt-1">
            {events.length} evento{events.length !== 1 ? "s" : ""} em {MONTHS_PT[month - 1]}
          </p>
        </div>
        <button
          onClick={() => openCreateForm(selectedDay ?? undefined)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> Novo Evento
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cockpit-text">
              {editingEvent ? "Editar Evento" : "Novo Evento"}
            </h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg">
              <X size={16} />
            </button>
          </div>

          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {(["MEETING", "ATA", "ACTION", "GENERAL"] as EventType[]).map((t) => {
              const Icon = EVENT_TYPE_ICON[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormType(t)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    formType === t
                      ? EVENT_TYPE_COLOR[t] + " border-current"
                      : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}
                >
                  <Icon size={13} /> {EVENT_TYPE_LABEL[t]}
                </button>
              )
            })}
          </div>

          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Título do evento *"
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Início *</label>
              <input
                type="datetime-local"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Fim (opcional)</label>
              <input
                type="datetime-local"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">
                <MapPin size={11} className="inline mr-1" />Local
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Ex: Sala 3, Google Meet..."
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">
                <Users size={11} className="inline mr-1" />Participantes
              </label>
              <input
                type="text"
                value={formAttendees}
                onChange={(e) => setFormAttendees(e.target.value)}
                placeholder="João, Maria, Pedro..."
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            rows={2}
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />

          {(formType === "ATA" || formType === "MEETING") && (
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={formType === "ATA" ? "Conteúdo da ata..." : "Anotações da reunião..."}
              rows={4}
              className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          )}

          {areas.length > 0 && (
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Área</label>
              <select
                value={formAreaId}
                onChange={(e) => setFormAreaId(e.target.value)}
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Nenhuma</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          )}

          {formError && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formTitle.trim() || !formDate || isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {editingEvent ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      )}

      {/* Calendar + Day Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Calendar Grid */}
        <div className="cockpit-card">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-base font-semibold text-cockpit-text">
              {MONTHS_PT[month - 1]} {year}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold text-cockpit-muted py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {isLoadingMonth ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-cockpit-border-light rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1
                const isToday = isCurrentMonth && today.getDate() === day
                const isSelected = selectedDay === day
                const items = getItemsForDay(day)
                const visible = items.slice(0, 3)
                const overflow = items.length - 3

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      "h-20 p-1.5 rounded-xl cursor-pointer border transition-all group",
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-transparent hover:border-cockpit-border hover:bg-cockpit-surface-hover"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                          isToday
                            ? "bg-accent text-black"
                            : isSelected
                              ? "text-accent-dark"
                              : "text-cockpit-muted group-hover:text-cockpit-text"
                        )}
                      >
                        {day}
                      </span>
                      {items.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openCreateForm(day) }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-cockpit-muted hover:text-accent rounded transition-all"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {visible.map((item, i) => {
                        if (item.kind === "event") {
                          return (
                            <div
                              key={item.data.id}
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate border",
                                EVENT_TYPE_COLOR[item.data.type as EventType]
                              )}
                            >
                              {item.data.title}
                            </div>
                          )
                        }
                        return (
                          <div
                            key={item.data.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          >
                            ✓ {item.data.title}
                          </div>
                        )
                      })}
                      {overflow > 0 && (
                        <div className="text-[10px] text-cockpit-muted px-1">+{overflow} mais</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-cockpit-border">
            {(["MEETING", "ATA", "ACTION", "GENERAL"] as EventType[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", EVENT_TYPE_DOT[t])} />
                <span className="text-[11px] text-cockpit-muted">{EVENT_TYPE_LABEL[t]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-cockpit-muted">Tarefa</span>
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="cockpit-card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cockpit-text">
              {formattedSelectedDay
                ? <span className="capitalize">{formattedSelectedDay}</span>
                : "Selecione um dia"}
            </h3>
            {selectedDay && (
              <button
                onClick={() => openCreateForm(selectedDay)}
                className="p-1.5 text-cockpit-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                title="Novo evento neste dia"
              >
                <Plus size={15} />
              </button>
            )}
          </div>

          {!selectedDay ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-cockpit-muted">
              <Calendar size={32} strokeWidth={1} />
              <p className="text-sm mt-3 text-center">Clique em um dia para ver os eventos</p>
            </div>
          ) : selectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-cockpit-muted">
              <Calendar size={32} strokeWidth={1} />
              <p className="text-sm mt-3">Nenhum evento neste dia</p>
              <button
                onClick={() => openCreateForm(selectedDay)}
                className="mt-3 text-xs text-accent hover:text-accent-hover font-medium"
              >
                + Criar evento
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto">
              {selectedItems.map((item) => {
                if (item.kind === "task") {
                  const t = item.data
                  return (
                    <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
                      <CheckSquare size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cockpit-text truncate">{t.title}</p>
                        <p className="text-xs text-cockpit-muted mt-0.5">Tarefa · Prazo</p>
                        {t.areas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.areas.map(({ area }) => (
                              <span key={area.id} className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: area.color }}>
                                {area.icon} {area.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                const ev = item.data
                const Icon = EVENT_TYPE_ICON[ev.type as EventType]
                const startTime = new Date(ev.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                const endTime = ev.endDate ? new Date(ev.endDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null

                return (
                  <div key={ev.id} className="group p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
                    <div className="flex items-start gap-2">
                      <div className={cn("p-1.5 rounded-lg mt-0.5 flex-shrink-0", EVENT_TYPE_COLOR[ev.type as EventType])}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-medium text-cockpit-text truncate">{ev.title}</p>
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditForm(ev)}
                              className="p-1 text-cockpit-muted hover:text-accent rounded-lg hover:bg-accent/10 transition-colors"
                              title="Editar"
                            >
                              <FileText size={12} />
                            </button>
                            <button
                              onClick={() => handleArchive(ev.id)}
                              className="p-1 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
                              title="Arquivar"
                            >
                              <Archive size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", EVENT_TYPE_COLOR[ev.type as EventType])}>
                            {EVENT_TYPE_LABEL[ev.type as EventType]}
                          </span>
                          <span className="text-[10px] text-cockpit-muted">
                            {startTime}{endTime ? ` – ${endTime}` : ""}
                          </span>
                        </div>

                        {ev.location && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <MapPin size={11} className="text-cockpit-muted flex-shrink-0" />
                            <span className="text-xs text-cockpit-muted truncate">{ev.location}</span>
                          </div>
                        )}

                        {ev.attendees.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users size={11} className="text-cockpit-muted flex-shrink-0" />
                            <span className="text-xs text-cockpit-muted truncate">{ev.attendees.join(", ")}</span>
                          </div>
                        )}

                        {ev.description && (
                          <p className="text-xs text-cockpit-muted mt-1.5 line-clamp-2">{ev.description}</p>
                        )}

                        {ev.notes && (
                          <div className="mt-2 p-2 bg-cockpit-surface rounded-lg">
                            <p className="text-xs text-cockpit-muted whitespace-pre-wrap line-clamp-3">{ev.notes}</p>
                          </div>
                        )}

                        {ev.area && (
                          <div className="mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: ev.area.color }}>
                              {ev.area.icon} {ev.area.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
