"use client"

import { useState, useTransition } from "react"
import { Plus, Archive, Layers, X, Loader2 } from "lucide-react"
import { createAreaAction, archiveAreaAction } from "@/app/actions/area.actions"
import type { Area } from "@/types"

const PRESET_COLORS = [
  "#00D6AB", "#3B82F6", "#8B5CF6", "#EF4444",
  "#F59E0B", "#10B981", "#EC4899", "#F97316",
]

const PRESET_ICONS = ["📁", "💼", "🏃", "💰", "📚", "🎬", "🧠", "🎯", "🚀", "🌟", "💡", "🔥"]

interface Props {
  initialAreas: Area[]
}

export function AreasClient({ initialAreas }: Props) {
  const [areas, setAreas] = useState<Area[]>(initialAreas)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [color, setColor] = useState("#00D6AB")
  const [icon, setIcon] = useState("📁")
  const [description, setDescription] = useState("")

  function resetForm() {
    setName(""); setColor("#00D6AB"); setIcon("📁"); setDescription("")
    setShowForm(false)
  }

  function handleCreate() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createAreaAction({ name, color, icon, description: description || undefined })
      if (result.success) {
        setAreas((prev) => [...prev, result.data as Area])
        resetForm()
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveAreaAction(id)
      if (result.success) setAreas((prev) => prev.filter((a) => a.id !== id))
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Áreas</h1>
          <p className="text-sm text-cockpit-muted mt-1">
            {areas.length} área{areas.length !== 1 ? "s" : ""} · classificam tarefas, finanças, conteúdo e estudos
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} /> Nova Área
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cockpit-text">Nova Área</h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marketing, Saúde..."
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-cockpit-muted mb-1.5">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-9 h-9 text-lg rounded-lg flex items-center justify-center border transition-all ${
                    icon === i ? "border-accent bg-accent/10" : "border-cockpit-border hover:border-cockpit-text/30"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-cockpit-muted mb-1.5">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "border-cockpit-text scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cockpit-bg border border-cockpit-border-light">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: color + "20" }}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-cockpit-text">{name || "Nome da área"}</p>
              {description && <p className="text-xs text-cockpit-muted">{description}</p>}
            </div>
            <div className="ml-auto w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {areas.length === 0 ? (
        <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
          <Layers size={32} strokeWidth={1} />
          <p className="text-sm mt-3">Nenhuma área cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => (
            <div key={area.id} className="cockpit-card group relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: area.color + "20" }}
                  >
                    {area.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-cockpit-text">{area.name}</h3>
                    {area.description && (
                      <p className="text-xs text-cockpit-muted mt-0.5 line-clamp-1">{area.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleArchive(area.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all"
                  title="Arquivar"
                >
                  <Archive size={14} />
                </button>
              </div>
              <div className="mt-3 w-full h-1 rounded-full" style={{ backgroundColor: area.color + "40" }}>
                <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: area.color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
