"use client"

import { useMemo, useState, useTransition } from "react"
import {
  ChevronLeft, ChevronRight, Plus, X, Archive,
  MapPin, Users, FileText, Loader2, Calendar,
  CheckSquare, Zap, Coffee, BookOpen,
  Search, SlidersHorizontal, List, LayoutGrid, Eye, EyeOff, AlertTriangle, Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  archiveCalendarEventAction,
} from "@/app/actions/calendar.actions"
import type { CalendarEventWithArea, TaskWithDue, StudyPlanned, Area } from "@/types"
import { DatePicker } from "@/components/ui/DatePicker"

type EventType = "MEETING" | "ATA" | "ACTION" | "GENERAL"
type ViewMode = "calendar" | "agenda"
type ItemKind = "event" | "task" | "study"

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPE_LABEL: Record<EventType, string> = { MEETING: "Reunião", ATA: "Ata", ACTION: "Ação", GENERAL: "Geral" }
const EVENT_TYPE_COLOR: Record<EventType, string> = {
  MEETING: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  ATA: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  ACTION: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  GENERAL: "bg-accent/15 text-accent-dark border-accent/20",
}
const EVENT_TYPE_DOT: Record<EventType, string> = { MEETING: "bg-blue-500", ATA: "bg-purple-500", ACTION: "bg-amber-500", GENERAL: "bg-accent" }
const EVENT_TYPE_ICON: Record<EventType, React.ElementType> = { MEETING: Users, ATA: FileText, ACTION: Zap, GENERAL: Coffee }

const KIND_LABEL: Record<ItemKind, string> = { event: "Eventos", task: "Tarefas", study: "Estudos" }
const KIND_ICON: Record<ItemKind, React.ElementType> = { event: Calendar, task: CheckSquare, study: BookOpen }
const KIND_DOT: Record<ItemKind, string> = { event: "bg-blue-500", task: "bg-emerald-500", study: "bg-violet-500" }

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// ─── Types ───────────────────────────────────────────────────────────────────

type DayItem =
  | { kind: "event"; data: CalendarEventWithArea; date: Date }
  | { kind: "task"; data: TaskWithDue; date: Date }
  | { kind: "study"; data: StudyPlanned; date: Date }

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  initialEvents: CalendarEventWithArea[]
  initialTasks: TaskWithDue[]
  initialStudies: StudyPlanned[]
  areas: Area[]
  initialYear: number
  initialMonth: number
}

export function CalendarioClient({ initialEvents, initialTasks, initialStudies, areas, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [events, setEvents] = useState<CalendarEventWithArea[]>(initialEvents)
  const [tasks, setTasks] = useState<TaskWithDue[]>(initialTasks)
  const [studies, setStudies] = useState<StudyPlanned[]>(initialStudies)
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithArea | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [formError, setFormError] = useState("")

  // View & filters
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [kindFilters, setKindFilters] = useState<ItemKind[]>([])
  const [eventTypeFilters, setEventTypeFilters] = useState<EventType[]>([])
  const [areaFilters, setAreaFilters] = useState<string[]>([])
  const [showPastItems, setShowPastItems] = useState(true)

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

  // ── Build all items ─────────────────────────────────────────────────────

  const allItems = useMemo(() => {
    const items: DayItem[] = []
    for (const ev of events) items.push({ kind: "event", data: ev, date: new Date(ev.date) })
    for (const t of tasks) if (t.dueDate) items.push({ kind: "task", data: t, date: new Date(t.dueDate) })
    for (const s of studies) if (s.plannedDate) items.push({ kind: "study", data: s, date: new Date(s.plannedDate) })
    return items
  }, [events, tasks, studies])

  // ── Filter logic ────────────────────────────────────────────────────────

  const activeFilterCount = kindFilters.length + eventTypeFilters.length + areaFilters.length + (search ? 1 : 0) + (!showPastItems ? 1 : 0)

  function filterItem(item: DayItem): boolean {
    // Search
    if (search) {
      const q = search.toLowerCase()
      const title = item.data.title.toLowerCase()
      if (!title.includes(q)) return false
    }
    // Kind
    if (kindFilters.length > 0 && !kindFilters.includes(item.kind)) return false
    // Event type
    if (eventTypeFilters.length > 0 && item.kind === "event") {
      if (!eventTypeFilters.includes((item.data as CalendarEventWithArea).type as EventType)) return false
    }
    if (eventTypeFilters.length > 0 && item.kind !== "event") return false
    // Area
    if (areaFilters.length > 0) {
      if (item.kind === "event") {
        const ev = item.data as CalendarEventWithArea
        if (!ev.areaId || !areaFilters.includes(ev.areaId)) return false
      } else if (item.kind === "task") {
        const t = item.data as TaskWithDue
        if (!t.areas.some(({ area }) => areaFilters.includes(area.id))) return false
      } else {
        const s = item.data as StudyPlanned
        if (!s.areaId || !areaFilters.includes(s.areaId)) return false
      }
    }
    // Past items
    if (!showPastItems) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (item.date < today) return false
    }
    return true
  }

  const filteredItems = useMemo(() => allItems.filter(filterItem), [allItems, search, kindFilters, eventTypeFilters, areaFilters, showPastItems])

  // ── Counts ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const kind: Record<ItemKind, number> = { event: 0, task: 0, study: 0 }
    const evType: Record<EventType, number> = { MEETING: 0, ATA: 0, ACTION: 0, GENERAL: 0 }
    const area: Record<string, number> = {}
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let upcoming = 0
    let overdue = 0

    for (const item of allItems) {
      kind[item.kind]++
      if (item.kind === "event") evType[(item.data as CalendarEventWithArea).type as EventType]++

      // Area
      if (item.kind === "event") { const a = (item.data as CalendarEventWithArea).areaId; if (a) area[a] = (area[a] || 0) + 1 }
      else if (item.kind === "task") { for (const { area: a } of (item.data as TaskWithDue).areas) area[a.id] = (area[a.id] || 0) + 1 }
      else { const a = (item.data as StudyPlanned).areaId; if (a) area[a] = (area[a] || 0) + 1 }

      if (item.date >= today) upcoming++
      if (item.kind === "task" && item.date < today) {
        const t = item.data as TaskWithDue
        if (t.status !== "DONE" && t.status !== "CANCELLED") overdue++
      }
    }
    return { kind, evType, area, total: allItems.length, upcoming, overdue }
  }, [allItems])

  // ── Calendar grid ───────────────────────────────────────────────────────

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  function getItemsForDay(day: number): DayItem[] {
    return filteredItems.filter((item) => {
      const d = item.date
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year
    })
  }

  // ── Month navigation ──────────────────────────────────────────────────

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
        setTasks(data.tasks ?? [])
        setStudies(data.studies ?? [])
      }
    } catch { /* fallback silently */ }
    setIsLoadingMonth(false)
  }

  function goToToday() {
    const now = new Date()
    const tMonth = now.getMonth() + 1
    const tYear = now.getFullYear()
    if (tMonth !== month || tYear !== year) {
      setMonth(tMonth); setYear(tYear)
      // Reload data
      setIsLoadingMonth(true)
      fetch(`/api/calendar?year=${tYear}&month=${tMonth}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) { setEvents(data.events ?? []); setTasks(data.tasks ?? []); setStudies(data.studies ?? []) } })
        .finally(() => setIsLoadingMonth(false))
    }
    setSelectedDay(now.getDate())
  }

  // ── Form ──────────────────────────────────────────────────────────────

  function openCreateForm(day?: number) {
    resetForm(); setFormError("")
    if (day) {
      const d = new Date(year, month - 1, day, 9, 0)
      setFormDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`)
    }
    setShowForm(true); setEditingEvent(null)
  }

  function toLocalInput(date: Date | string): string {
    const d = new Date(date)
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 16)
  }

  function openEditForm(ev: CalendarEventWithArea) {
    setEditingEvent(ev); setFormTitle(ev.title); setFormType(ev.type as EventType)
    setFormDate(toLocalInput(ev.date)); setFormEndDate(ev.endDate ? toLocalInput(ev.endDate) : "")
    setFormDescription(ev.description ?? ""); setFormLocation(ev.location ?? "")
    setFormAttendees(ev.attendees.join(", ")); setFormNotes(ev.notes ?? "")
    setFormAreaId(ev.areaId ?? ""); setShowForm(true)
  }

  function resetForm() {
    setFormTitle(""); setFormType("GENERAL"); setFormDate(""); setFormEndDate("")
    setFormDescription(""); setFormLocation(""); setFormAttendees(""); setFormNotes("")
    setFormAreaId(""); setShowForm(false); setEditingEvent(null)
  }

  function handleSubmit() {
    if (!formTitle.trim() || !formDate) return
    const payload = {
      title: formTitle.trim(), type: formType,
      date: new Date(formDate).toISOString(),
      endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
      description: formDescription || undefined, location: formLocation || undefined,
      attendees: formAttendees ? formAttendees.split(",").map((s) => s.trim()).filter(Boolean) : [],
      notes: formNotes || undefined, areaId: formAreaId || null,
    }
    setFormError("")
    startTransition(async () => {
      if (editingEvent) {
        const res = await updateCalendarEventAction(editingEvent.id, payload)
        if (res.success) { setEvents((prev) => prev.map((e) => e.id === editingEvent.id ? res.data as CalendarEventWithArea : e)); resetForm() }
        else setFormError(res.error ?? "Erro ao atualizar")
      } else {
        const res = await createCalendarEventAction(payload)
        if (res.success) { setEvents((prev) => [...prev, res.data as CalendarEventWithArea]); resetForm() }
        else setFormError(res.error ?? "Erro ao criar")
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const res = await archiveCalendarEventAction(id)
      if (res.success) setEvents((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function clearAllFilters() {
    setSearch(""); setKindFilters([]); setEventTypeFilters([]); setAreaFilters([]); setShowPastItems(true)
  }

  // ── Agenda view items ──────────────────────────────────────────────────

  const agendaItems = useMemo(() => {
    const sorted = [...filteredItems]
      .filter((item) => {
        const d = item.date
        return d.getMonth() + 1 === month && d.getFullYear() === year
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const grouped: { day: number; weekday: string; items: DayItem[] }[] = []
    for (const item of sorted) {
      const day = item.date.getDate()
      const last = grouped[grouped.length - 1]
      if (last && last.day === day) {
        last.items.push(item)
      } else {
        const weekday = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "long" })
        grouped.push({ day, weekday, items: [item] })
      }
    }
    return grouped
  }, [filteredItems, month, year])

  // ── Overview data ──────────────────────────────────────────────────────

  const upcomingItems = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return allItems
      .filter((item) => item.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5)
  }, [allItems])

  const overdueTaskItems = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return allItems
      .filter((item) => {
        if (item.kind !== "task") return false
        const t = item.data as TaskWithDue
        return item.date < now && t.status !== "DONE" && t.status !== "CANCELLED"
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [allItems])

  // ── Render helpers ─────────────────────────────────────────────────────

  const selectedItems = selectedDay ? getItemsForDay(selectedDay) : []
  const formattedSelectedDay = selectedDay
    ? new Date(year, month - 1, selectedDay).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : null

  function renderItemCard(item: DayItem, compact = false) {
    if (item.kind === "study") {
      const s = item.data as StudyPlanned
      const time = s.plannedDate ? new Date(s.plannedDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null
      return (
        <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
          <BookOpen size={15} className="text-violet-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cockpit-text hover:text-accent truncate block">{s.title}</a>
            <p className="text-xs text-cockpit-muted mt-0.5">Estudo{time ? ` · ${time}` : ""}</p>
            {s.area && (
              <div className="mt-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: s.area.color }}>{s.area.icon} {s.area.name}</span>
              </div>
            )}
          </div>
        </div>
      )
    }
    if (item.kind === "task") {
      const t = item.data as TaskWithDue
      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE" && t.status !== "CANCELLED"
      return (
        <div key={t.id} className={cn("flex items-start gap-3 p-3 rounded-xl border bg-cockpit-bg", isOverdue ? "border-red-500/30" : "border-cockpit-border")}>
          <CheckSquare size={15} className={cn("mt-0.5 flex-shrink-0", isOverdue ? "text-red-400" : "text-emerald-500")} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-cockpit-text truncate">{t.title}</p>
            <p className="text-xs text-cockpit-muted mt-0.5 flex items-center gap-1">
              Tarefa
              {isOverdue && <span className="flex items-center gap-0.5 text-red-400 font-medium"><AlertTriangle size={10} /> Atrasada</span>}
            </p>
            {t.areas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {t.areas.map(({ area }) => (
                  <span key={area.id} className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: area.color }}>{area.icon} {area.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }
    const ev = item.data as CalendarEventWithArea
    const Icon = EVENT_TYPE_ICON[ev.type as EventType]
    const startTime = new Date(ev.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const endTime = ev.endDate ? new Date(ev.endDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null
    return (
      <div key={ev.id} className="group p-3 rounded-xl border border-cockpit-border bg-cockpit-bg">
        <div className="flex items-start gap-2">
          <div className={cn("p-1.5 rounded-lg mt-0.5 flex-shrink-0", EVENT_TYPE_COLOR[ev.type as EventType])}><Icon size={13} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-medium text-cockpit-text truncate">{ev.title}</p>
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditForm(ev)} className="p-1 text-cockpit-muted hover:text-accent rounded-lg hover:bg-accent/10 transition-colors" title="Editar"><FileText size={12} /></button>
                <button onClick={() => handleArchive(ev.id)} className="p-1 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors" title="Arquivar"><Archive size={12} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", EVENT_TYPE_COLOR[ev.type as EventType])}>{EVENT_TYPE_LABEL[ev.type as EventType]}</span>
              <span className="text-[10px] text-cockpit-muted flex items-center gap-0.5"><Clock size={10} /> {startTime}{endTime ? ` – ${endTime}` : ""}</span>
            </div>
            {!compact && ev.location && <div className="flex items-center gap-1 mt-1.5"><MapPin size={11} className="text-cockpit-muted flex-shrink-0" /><span className="text-xs text-cockpit-muted truncate">{ev.location}</span></div>}
            {!compact && ev.attendees.length > 0 && <div className="flex items-center gap-1 mt-1"><Users size={11} className="text-cockpit-muted flex-shrink-0" /><span className="text-xs text-cockpit-muted truncate">{ev.attendees.join(", ")}</span></div>}
            {!compact && ev.description && <p className="text-xs text-cockpit-muted mt-1.5 line-clamp-2">{ev.description}</p>}
            {ev.area && <div className="mt-1.5"><span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: ev.area.color }}>{ev.area.icon} {ev.area.name}</span></div>}
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Calendário</h1>
          <p className="text-sm text-cockpit-muted mt-1">
            {MONTHS_PT[month - 1]} {year} · {filteredItems.filter((i) => i.date.getMonth() + 1 === month && i.date.getFullYear() === year).length} itens
          </p>
        </div>
        <button onClick={() => openCreateForm(selectedDay ?? undefined)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors">
          <Plus size={16} /> Novo Evento
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => { clearAllFilters(); setKindFilters(["event"]) }} className={cn("cockpit-card !py-3 text-left hover:border-blue-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "event" && "!border-blue-500/40")}>
          <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><Calendar size={11} /> Eventos</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{counts.kind.event}</p>
        </button>
        <button onClick={() => { clearAllFilters(); setKindFilters(["task"]) }} className={cn("cockpit-card !py-3 text-left hover:border-emerald-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "task" && "!border-emerald-500/40")}>
          <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><CheckSquare size={11} /> Tarefas</p>
          <p className={cn("text-2xl font-bold mt-1", counts.overdue > 0 ? "text-red-400" : "text-emerald-400")}>{counts.kind.task}</p>
          {counts.overdue > 0 && <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-0.5"><AlertTriangle size={9} /> {counts.overdue} atrasada{counts.overdue !== 1 ? "s" : ""}</p>}
        </button>
        <button onClick={() => { clearAllFilters(); setKindFilters(["study"]) }} className={cn("cockpit-card !py-3 text-left hover:border-violet-500/30 transition-colors", kindFilters.length === 1 && kindFilters[0] === "study" && "!border-violet-500/40")}>
          <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><BookOpen size={11} /> Estudos</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">{counts.kind.study}</p>
        </button>
        <button onClick={() => { clearAllFilters(); setShowPastItems(false) }} className={cn("cockpit-card !py-3 text-left hover:border-accent/30 transition-colors", !showPastItems && kindFilters.length === 0 && "!border-accent/40")}>
          <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Próximos</p>
          <p className="text-2xl font-bold text-accent mt-1">{counts.upcoming}</p>
        </button>
      </div>

      {/* Overview: próximos + atrasadas */}
      {(upcomingItems.length > 0 || overdueTaskItems.length > 0) && (
        <div className={cn("grid gap-4", overdueTaskItems.length > 0 && upcomingItems.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
          {/* Próximos */}
          {upcomingItems.length > 0 && (
            <div className="cockpit-card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-cockpit-border flex items-center justify-between">
                <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-accent" /> Próximos
                </h3>
                <span className="text-[10px] text-cockpit-muted">{counts.upcoming} total</span>
              </div>
              <div className="divide-y divide-cockpit-border">
                {upcomingItems.map((item) => {
                  const isToday = item.date.toDateString() === new Date().toDateString()
                  const isTomorrow = (() => { const t = new Date(); t.setDate(t.getDate() + 1); return item.date.toDateString() === t.toDateString() })()
                  const dateLabel = isToday ? "Hoje" : isTomorrow ? "Amanhã" : item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  const time = item.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                  const KindIcon = KIND_ICON[item.kind]

                  return (
                    <div key={item.data.id + item.kind} className="flex items-center gap-3 px-4 py-2.5 hover:bg-cockpit-surface-hover transition-colors">
                      <div className={cn("w-8 text-right flex-shrink-0")}>
                        <p className={cn("text-xs font-bold", isToday ? "text-accent" : "text-cockpit-text")}>{dateLabel}</p>
                        <p className="text-[10px] text-cockpit-muted">{time}</p>
                      </div>
                      <div className={cn("w-0.5 h-8 rounded-full flex-shrink-0", KIND_DOT[item.kind])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cockpit-text truncate">{item.data.title}</p>
                        <p className="text-[10px] text-cockpit-muted flex items-center gap-1">
                          <KindIcon size={10} />
                          {item.kind === "event" && EVENT_TYPE_LABEL[(item.data as CalendarEventWithArea).type as EventType]}
                          {item.kind === "task" && "Tarefa"}
                          {item.kind === "study" && "Estudo"}
                          {item.kind === "event" && (item.data as CalendarEventWithArea).area && (
                            <span className="ml-1 px-1.5 py-0 rounded-full text-white text-[9px]" style={{ backgroundColor: (item.data as CalendarEventWithArea).area!.color }}>
                              {(item.data as CalendarEventWithArea).area!.icon}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tarefas atrasadas */}
          {overdueTaskItems.length > 0 && (
            <div className="cockpit-card !p-0 overflow-hidden !border-red-500/20">
              <div className="px-4 py-3 border-b border-red-500/20 bg-red-500/[0.03] flex items-center justify-between">
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Tarefas em atraso
                </h3>
                <span className="text-[10px] text-red-400/70">{overdueTaskItems.length} tarefa{overdueTaskItems.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-cockpit-border">
                {overdueTaskItems.map((item) => {
                  const t = item.data as TaskWithDue
                  const daysLate = Math.floor((new Date().getTime() - item.date.getTime()) / 86400000)
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-cockpit-surface-hover transition-colors">
                      <div className="w-8 text-right flex-shrink-0">
                        <p className="text-xs font-bold text-red-400">{daysLate}d</p>
                        <p className="text-[10px] text-red-400/60">atraso</p>
                      </div>
                      <div className="w-0.5 h-8 rounded-full bg-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cockpit-text truncate">{t.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-cockpit-muted">Prazo: {item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                          {t.areas.length > 0 && t.areas.map(({ area }) => (
                            <span key={area.id} className="px-1.5 py-0 rounded-full text-white text-[9px]" style={{ backgroundColor: area.color }}>{area.icon}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + filters + view mode */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar eventos, tarefas, estudos..."
            className="w-full pl-9 pr-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button onClick={() => setShowFilters((f) => !f)} className={cn(
          "flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm transition-colors",
          showFilters || activeFilterCount > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-cockpit-bg border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
        )}>
          <SlidersHorizontal size={15} /> Filtros
          {activeFilterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-black text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
        </button>
        <div className="flex bg-cockpit-border-light rounded-xl p-0.5">
          <button onClick={() => setViewMode("calendar")} className={cn("p-2 rounded-lg transition-colors", viewMode === "calendar" ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text")}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => setViewMode("agenda")} className={cn("p-2 rounded-lg transition-colors", viewMode === "agenda" ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text")}>
            <List size={15} />
          </button>
        </div>
        <button onClick={goToToday} className="px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-xs font-medium text-cockpit-muted hover:text-cockpit-text transition-colors">
          Hoje
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Filtros avançados</h3>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="text-xs text-cockpit-muted hover:text-red-400 transition-colors">Limpar todos</button>}
          </div>

          {/* Kind */}
          <div>
            <p className="text-[11px] text-cockpit-muted font-medium mb-2">Tipo de item</p>
            <div className="flex flex-wrap gap-1.5">
              {(["event", "task", "study"] as ItemKind[]).map((k) => {
                const Icon = KIND_ICON[k]
                return (
                  <button key={k} onClick={() => setKindFilters((f) => toggle(f, k))} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    kindFilters.includes(k) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                    <Icon size={12} /> {KIND_LABEL[k]}
                    <span className="text-[10px] opacity-60">{counts.kind[k]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Event type */}
          <div>
            <p className="text-[11px] text-cockpit-muted font-medium mb-2">Tipo de evento</p>
            <div className="flex flex-wrap gap-1.5">
              {(["MEETING", "ATA", "ACTION", "GENERAL"] as EventType[]).map((t) => {
                const Icon = EVENT_TYPE_ICON[t]
                return (
                  <button key={t} onClick={() => setEventTypeFilters((f) => toggle(f, t))} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    eventTypeFilters.includes(t) ? EVENT_TYPE_COLOR[t] + " border-current" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                    <Icon size={12} /> {EVENT_TYPE_LABEL[t]}
                    <span className="text-[10px] opacity-60">{counts.evType[t]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Areas */}
          {areas.length > 0 && (
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Áreas</p>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((area) => (
                  <button key={area.id} onClick={() => setAreaFilters((f) => toggle(f, area.id))} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    areaFilters.includes(area.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )} style={areaFilters.includes(area.id) ? { backgroundColor: area.color } : undefined}>
                    {area.icon} {area.name}
                    <span className="text-[10px] opacity-70">{counts.area[area.id] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Past toggle */}
          <div>
            <button onClick={() => setShowPastItems((p) => !p)} className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              !showPastItems ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
            )}>
              {showPastItems ? <Eye size={12} /> : <EyeOff size={12} />}
              {showPastItems ? "Mostrando passados" : "Ocultando passados"}
            </button>
          </div>
        </div>
      )}

      {/* Active filter tags (collapsed) */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-cockpit-muted mr-1">Filtros:</span>
          {kindFilters.map((k) => (
            <span key={k} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
              {KIND_LABEL[k]} <button onClick={() => setKindFilters((f) => f.filter((v) => v !== k))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
            </span>
          ))}
          {eventTypeFilters.map((t) => (
            <span key={t} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border", EVENT_TYPE_COLOR[t])}>
              {EVENT_TYPE_LABEL[t]} <button onClick={() => setEventTypeFilters((f) => f.filter((v) => v !== t))} className="opacity-60 hover:opacity-100"><X size={10} /></button>
            </span>
          ))}
          {areaFilters.map((id) => {
            const area = areas.find((a) => a.id === id)
            if (!area) return null
            return (
              <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white" style={{ backgroundColor: area.color }}>
                {area.icon} {area.name} <button onClick={() => setAreaFilters((f) => f.filter((v) => v !== id))} className="opacity-70 hover:opacity-100"><X size={10} /></button>
              </span>
            )
          })}
          {!showPastItems && (
            <span className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">
              Sem passados <button onClick={() => setShowPastItems(true)} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button>
            </span>
          )}
          <button onClick={clearAllFilters} className="text-[11px] text-cockpit-muted hover:text-red-400 ml-1">Limpar</button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cockpit-text">{editingEvent ? "Editar Evento" : "Novo Evento"}</h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg"><X size={16} /></button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["MEETING", "ATA", "ACTION", "GENERAL"] as EventType[]).map((t) => {
              const Icon = EVENT_TYPE_ICON[t]
              return (
                <button key={t} type="button" onClick={() => setFormType(t)} className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  formType === t ? EVENT_TYPE_COLOR[t] + " border-current" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                )}><Icon size={13} /> {EVENT_TYPE_LABEL[t]}</button>
              )
            })}
          </div>
          <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Título do evento *" className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Início *</label><DatePicker value={formDate} onChange={setFormDate} mode="datetime" required /></div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Fim (opcional)</label><DatePicker value={formEndDate} onChange={setFormEndDate} mode="datetime" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-cockpit-muted mb-1.5"><MapPin size={11} className="inline mr-1" />Local</label><input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="Ex: Sala 3, Google Meet..." className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5"><Users size={11} className="inline mr-1" />Participantes</label><input type="text" value={formAttendees} onChange={(e) => setFormAttendees(e.target.value)} placeholder="João, Maria, Pedro..." className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          </div>
          <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descrição (opcional)" rows={2} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
          {(formType === "ATA" || formType === "MEETING") && (
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={formType === "ATA" ? "Conteúdo da ata..." : "Anotações da reunião..."} rows={4} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
          )}
          {areas.length > 0 && (
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Área</label>
              <select value={formAreaId} onChange={(e) => setFormAreaId(e.target.value)} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Nenhuma</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          )}
          {formError && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={!formTitle.trim() || !formDate || isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {editingEvent ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="cockpit-card">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => navigateMonth(-1)} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"><ChevronLeft size={18} /></button>
              <h2 className="text-base font-semibold text-cockpit-text">{MONTHS_PT[month - 1]} {year}</h2>
              <button onClick={() => navigateMonth(1)} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => <div key={w} className="text-center text-[11px] font-semibold text-cockpit-muted py-1">{w}</div>)}
            </div>
            {isLoadingMonth ? (
              <div className="grid grid-cols-7 gap-1">{Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-20 bg-cockpit-border-light rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="h-20" />)}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1
                  const isToday = isCurrentMonth && today.getDate() === day
                  const isSelected = selectedDay === day
                  const items = getItemsForDay(day)
                  const visible = items.slice(0, 3)
                  const overflow = items.length - 3
                  return (
                    <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)} className={cn(
                      "h-20 p-1.5 rounded-xl cursor-pointer border transition-all group",
                      isSelected ? "border-accent bg-accent/5" : "border-transparent hover:border-cockpit-border hover:bg-cockpit-surface-hover"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                          isToday ? "bg-accent text-black" : isSelected ? "text-accent-dark" : "text-cockpit-muted group-hover:text-cockpit-text"
                        )}>{day}</span>
                        {items.length > 0 && <button onClick={(e) => { e.stopPropagation(); openCreateForm(day) }} className="opacity-0 group-hover:opacity-100 p-0.5 text-cockpit-muted hover:text-accent rounded transition-all"><Plus size={11} /></button>}
                      </div>
                      <div className="space-y-0.5">
                        {visible.map((item) => {
                          if (item.kind === "event") return <div key={item.data.id} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate border", EVENT_TYPE_COLOR[(item.data as CalendarEventWithArea).type as EventType])}>{item.data.title}</div>
                          if (item.kind === "task") return <div key={item.data.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">✓ {item.data.title}</div>
                          return <div key={item.data.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate bg-violet-500/10 text-violet-600 border border-violet-500/20">📚 {item.data.title}</div>
                        })}
                        {overflow > 0 && <div className="text-[10px] text-cockpit-muted px-1">+{overflow}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-cockpit-border">
              {(["event", "task", "study"] as ItemKind[]).map((k) => (
                <div key={k} className="flex items-center gap-1.5"><div className={cn("w-2 h-2 rounded-full", KIND_DOT[k])} /><span className="text-[11px] text-cockpit-muted">{KIND_LABEL[k]}</span></div>
              ))}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="cockpit-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cockpit-text">
                {formattedSelectedDay ? <span className="capitalize">{formattedSelectedDay}</span> : "Selecione um dia"}
              </h3>
              {selectedDay && <button onClick={() => openCreateForm(selectedDay)} className="p-1.5 text-cockpit-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Novo evento"><Plus size={15} /></button>}
            </div>
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-cockpit-muted"><Calendar size={32} strokeWidth={1} /><p className="text-sm mt-3 text-center">Clique em um dia para ver detalhes</p></div>
            ) : selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 text-cockpit-muted"><Calendar size={32} strokeWidth={1} /><p className="text-sm mt-3">Nenhum item neste dia</p><button onClick={() => openCreateForm(selectedDay)} className="mt-3 text-xs text-accent hover:text-accent-hover font-medium">+ Criar evento</button></div>
            ) : (
              <div className="space-y-3 overflow-y-auto">{selectedItems.map((item) => renderItemCard(item))}</div>
            )}
          </div>
        </div>
      )}

      {/* ── AGENDA VIEW ── */}
      {viewMode === "agenda" && (
        <div className="space-y-1">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigateMonth(-1)} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"><ChevronLeft size={18} /></button>
            <h2 className="text-base font-semibold text-cockpit-text">{MONTHS_PT[month - 1]} {year}</h2>
            <button onClick={() => navigateMonth(1)} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"><ChevronRight size={18} /></button>
          </div>

          {agendaItems.length === 0 ? (
            <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
              <Calendar size={32} strokeWidth={1} />
              <p className="text-sm mt-3">{activeFilterCount > 0 ? "Nenhum item com esses filtros" : "Nenhum item neste mês"}</p>
              {activeFilterCount > 0 && <button onClick={clearAllFilters} className="text-xs text-accent mt-2 hover:underline">Limpar filtros</button>}
            </div>
          ) : (
            agendaItems.map(({ day, weekday, items }) => {
              const isToday = isCurrentMonth && today.getDate() === day
              return (
                <div key={day} className="flex gap-4 mb-4">
                  {/* Date column */}
                  <div className="w-16 flex-shrink-0 pt-3 text-right">
                    <p className={cn("text-2xl font-bold", isToday ? "text-accent" : "text-cockpit-text")}>{day}</p>
                    <p className={cn("text-[11px] capitalize", isToday ? "text-accent" : "text-cockpit-muted")}>{weekday}</p>
                    {isToday && <div className="mt-1 ml-auto w-fit px-1.5 py-0.5 bg-accent/15 text-accent text-[9px] font-bold rounded-full uppercase">Hoje</div>}
                  </div>
                  {/* Items */}
                  <div className="flex-1 space-y-2 border-l-2 border-cockpit-border pl-4" style={isToday ? { borderColor: "var(--color-accent)" } : undefined}>
                    {items.map((item) => renderItemCard(item, true))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
