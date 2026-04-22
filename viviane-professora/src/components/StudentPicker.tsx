"use client"

import { useState } from "react"

export interface StudentOption {
  id: string
  fullName: string
  classroom?: string | null
}

export function StudentPicker({
  students,
  value,
  onChange,
  placeholder = "Selecionar aluno...",
  required,
}: {
  students: StudentOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = students.find((s) => s.id === value)
  const filtered = query
    ? students.filter((s) => s.fullName.toLowerCase().includes(query.toLowerCase()))
    : students

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="app-input text-left flex items-center justify-between"
      >
        <span className={selected ? "" : "text-app-muted"} style={selected ? {} : { color: "var(--color-app-muted)" }}>
          {selected ? `${selected.fullName}${selected.classroom ? ` · ${selected.classroom}` : ""}` : placeholder}
        </span>
        <span className="text-app-muted text-xs" style={{ color: "var(--color-app-muted)" }}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-64 overflow-auto" style={{ borderColor: "var(--color-app-border)" }}>
          <input
            autoFocus
            type="text"
            className="w-full px-3 py-2 border-b text-sm outline-none"
            style={{ borderColor: "var(--color-app-border-light)" }}
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
              Nenhum aluno encontrado
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onChange(s.id); setOpen(false); setQuery("") }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-app-surface-hover"
                style={{ background: s.id === value ? "var(--color-accent-soft)" : undefined }}
              >
                {s.fullName}
                {s.classroom && <span className="text-xs text-app-muted ml-2" style={{ color: "var(--color-app-muted)" }}>{s.classroom}</span>}
              </button>
            ))
          )}
        </div>
      )}

      {required && !value && <input required value="" readOnly className="absolute opacity-0 pointer-events-none" />}
    </div>
  )
}
