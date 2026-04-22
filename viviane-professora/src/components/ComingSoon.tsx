export function ComingSoon({
  title,
  bullets,
  note,
}: {
  title: string
  bullets: string[]
  note?: string
}) {
  return (
    <div className="app-card" style={{ borderStyle: "dashed" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🚧</span>
        <h2 className="font-bold">{title}</h2>
      </div>
      <p className="text-xs text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
        Scaffold pronto. MVP desta tela:
      </p>
      <ul className="space-y-1.5 text-sm">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color: "var(--color-accent)" }}>→</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {note && (
        <p className="text-xs text-app-muted mt-3 pt-3 border-t" style={{ color: "var(--color-app-muted)", borderColor: "var(--color-app-border-light)" }}>
          {note}
        </p>
      )}
    </div>
  )
}
