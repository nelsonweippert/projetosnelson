export function FormField({
  label,
  children,
  full,
  required,
  hint,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
  required?: boolean
  hint?: string
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-medium text-app-muted mb-1" style={{ color: "var(--color-app-muted)" }}>
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function FormSection({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: 1 | 2 }) {
  return (
    <div className="app-card">
      <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
        {title}
      </h2>
      <div className={cols === 1 ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>{children}</div>
    </div>
  )
}
