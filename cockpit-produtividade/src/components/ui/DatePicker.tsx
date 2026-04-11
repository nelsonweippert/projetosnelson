"use client"

import { useEffect, useRef, useState } from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (value: string) => void
  mode?: "date" | "datetime"
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toDate(value: string, mode: "date" | "datetime"): Date | undefined {
  if (!value) return undefined
  if (mode === "date") {
    const [y, m, d] = value.split("-").map(Number)
    if (!y || !m || !d) return undefined
    return new Date(y, m - 1, d)
  }
  const [datePart, timePart = "00:00"] = value.split("T")
  const [y, m, d] = datePart.split("-").map(Number)
  const [hh, mm] = timePart.split(":").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

function fromDate(date: Date, mode: "date" | "datetime"): string {
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  if (mode === "date") return base
  return `${base}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDisplay(value: string, mode: "date" | "datetime"): string {
  const d = toDate(value, mode)
  if (!d) return ""
  const datePart = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  if (mode === "date") return datePart
  return `${datePart} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DatePicker({ value, onChange, mode = "date", placeholder, className, required, id }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = toDate(value, mode)
  const hours = selected?.getHours() ?? 9
  const minutes = selected?.getMinutes() ?? 0

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function handleSelect(date: Date | undefined) {
    if (!date) { onChange(""); return }
    if (mode === "datetime") date.setHours(hours, minutes, 0, 0)
    onChange(fromDate(date, mode))
    if (mode === "date") setOpen(false)
  }

  function handleTimeChange(part: "h" | "m", val: number) {
    const base = selected ? new Date(selected.getTime()) : new Date()
    if (part === "h") base.setHours(val); else base.setMinutes(val)
    onChange(fromDate(base, "datetime"))
  }

  function handleClear() {
    onChange("")
    setOpen(false)
  }

  const display = formatDisplay(value, mode)

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30 hover:border-cockpit-text/30 transition"
      >
        <span className={cn(!display && "text-cockpit-text/40")}>
          {display || placeholder || (mode === "datetime" ? "dd/mm/aaaa hh:mm" : "dd/mm/aaaa")}
        </span>
        <CalendarIcon className="w-4 h-4 text-cockpit-text/60 shrink-0" />
      </button>

      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
      )}

      {open && (
        <div className="absolute z-50 mt-2 bg-cockpit-surface border border-cockpit-border rounded-2xl shadow-2xl shadow-black/40 p-4 w-[310px]">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ptBR}
            showOutsideDays
            fixedWeeks
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left"
                  ? <ChevronLeft size={16} />
                  : <ChevronRight size={16} />,
            }}
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full",
              month_caption: "flex items-center justify-center mb-3 relative",
              caption_label: "text-sm font-semibold text-cockpit-text capitalize",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-0 top-0 p-1.5 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover transition-colors",
              button_next: "absolute right-0 top-0 p-1.5 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover transition-colors",
              month_grid: "w-full border-collapse",
              weekdays: "",
              weekday: "text-[11px] font-medium text-cockpit-muted/60 uppercase pb-2 w-10 text-center",
              weeks: "",
              week: "",
              day: "text-center p-0 relative",
              day_button: "w-9 h-9 mx-auto flex items-center justify-center text-sm rounded-lg text-cockpit-text/80 hover:bg-accent/15 hover:text-cockpit-text transition-colors cursor-pointer",
              selected: "[&_.rdp-day_button]:bg-accent [&_.rdp-day_button]:text-black [&_.rdp-day_button]:font-semibold [&_.rdp-day_button]:hover:bg-accent-hover",
              today: "[&_.rdp-day_button]:text-accent [&_.rdp-day_button]:font-bold",
              outside: "[&_.rdp-day_button]:text-cockpit-muted/30 [&_.rdp-day_button]:hover:text-cockpit-muted/50",
              disabled: "[&_.rdp-day_button]:opacity-30 [&_.rdp-day_button]:cursor-not-allowed [&_.rdp-day_button]:hover:bg-transparent",
              hidden: "invisible",
            }}
          />

          {/* Footer: limpar / hora */}
          <div className={cn(
            "flex items-center mt-3 pt-3 border-t border-cockpit-border",
            mode === "datetime" ? "gap-2" : "justify-center"
          )}>
            {mode === "datetime" && (
              <>
                <span className="text-xs text-cockpit-muted">Hora:</span>
                <select
                  value={hours}
                  onChange={(e) => handleTimeChange("h", Number(e.target.value))}
                  className="px-2 py-1 bg-cockpit-bg border border-cockpit-border rounded-lg text-sm text-cockpit-text focus:outline-none focus:ring-1 focus:ring-accent/40"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{pad(i)}</option>
                  ))}
                </select>
                <span className="text-cockpit-muted">:</span>
                <select
                  value={minutes}
                  onChange={(e) => handleTimeChange("m", Number(e.target.value))}
                  className="px-2 py-1 bg-cockpit-bg border border-cockpit-border rounded-lg text-sm text-cockpit-text focus:outline-none focus:ring-1 focus:ring-accent/40"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto px-3 py-1.5 bg-accent text-black text-xs font-semibold rounded-lg hover:bg-accent-hover transition-colors"
                >
                  OK
                </button>
              </>
            )}
            {mode === "date" && value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-cockpit-muted hover:text-red-400 transition-colors"
              >
                Limpar data
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
