"use client"

import { useEffect, useRef, useState } from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import "react-day-picker/style.css"
import { cn } from "@/lib/utils"

type Props = {
  /** valor no formato esperado pelo input nativo: "YYYY-MM-DD" (date) ou "YYYY-MM-DDTHH:mm" (datetime) */
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
  // Parse manualmente para evitar problemas de timezone com `new Date("YYYY-MM-DD")`
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
  const datePart = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  if (mode === "date") return datePart
  return `${datePart} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DatePicker({
  value,
  onChange,
  mode = "date",
  placeholder,
  className,
  required,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = toDate(value, mode)

  // Hora local para o seletor (fallback 09:00)
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
    if (!date) {
      onChange("")
      return
    }
    if (mode === "datetime") {
      date.setHours(hours, minutes, 0, 0)
    }
    onChange(fromDate(date, mode))
    if (mode === "date") setOpen(false)
  }

  function handleTimeChange(part: "h" | "m", val: number) {
    const base = selected ?? new Date()
    if (part === "h") base.setHours(val)
    else base.setMinutes(val)
    onChange(fromDate(base, "datetime"))
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

      {/* input oculto para validação nativa de `required` */}
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
        <div className="absolute z-50 mt-2 p-3 bg-cockpit-card border border-cockpit-border rounded-2xl shadow-2xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ptBR}
            showOutsideDays
            classNames={{
              root: "rdp-cockpit",
              caption_label: "text-sm font-semibold text-cockpit-text",
              nav_button: "text-cockpit-text/70 hover:text-accent",
              day: "text-cockpit-text/80 hover:bg-accent/10 rounded-lg",
              selected: "bg-accent text-black font-semibold",
              today: "text-accent",
            }}
          />
          {mode === "datetime" && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cockpit-border">
              <span className="text-xs text-cockpit-text/60">Hora:</span>
              <select
                value={hours}
                onChange={(e) => handleTimeChange("h", Number(e.target.value))}
                className="px-2 py-1 bg-cockpit-bg border border-cockpit-border rounded-lg text-sm text-cockpit-text focus:outline-none focus:ring-1 focus:ring-accent/40"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{pad(i)}</option>
                ))}
              </select>
              <span className="text-cockpit-text/60">:</span>
              <select
                value={minutes}
                onChange={(e) => handleTimeChange("m", Number(e.target.value))}
                className="px-2 py-1 bg-cockpit-bg border border-cockpit-border rounded-lg text-sm text-cockpit-text focus:outline-none focus:ring-1 focus:ring-accent/40"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{pad(i)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto px-3 py-1 bg-accent text-black text-xs font-semibold rounded-lg hover:opacity-90"
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
