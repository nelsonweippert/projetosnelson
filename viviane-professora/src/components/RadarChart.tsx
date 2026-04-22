export interface RadarAxis {
  key: string
  label: string
  emoji?: string
}

export interface RadarSeries {
  label: string
  color: string
  data: Record<string, number> // key → 1-5
  opacity?: number
}

export function RadarChart({
  axes,
  series,
  size = 360,
  maxValue = 5,
}: {
  axes: RadarAxis[]
  series: RadarSeries[]
  size?: number
  maxValue?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const padding = 70 // espaço para labels
  const maxR = size / 2 - padding

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length
  const point = (i: number, value: number) => {
    const r = (value / maxValue) * maxR
    const a = angleFor(i)
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
  }

  // Grid rings
  const rings = Array.from({ length: maxValue }, (_, i) => {
    const level = i + 1
    const pts = axes.map((_, idx) => point(idx, level).join(",")).join(" ")
    return { level, pts }
  })

  // Axes lines (center → outermost)
  const axesLines = axes.map((_, i) => {
    const [x, y] = point(i, maxValue)
    return { x1: cx, y1: cy, x2: x, y2: y, i }
  })

  // Labels position (slightly outside maxR)
  const labels = axes.map((axis, i) => {
    const a = angleFor(i)
    const r = maxR + 18
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    return { x, y, axis, a }
  })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block">
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r.level}
          points={r.pts}
          fill="none"
          stroke="var(--color-app-border)"
          strokeWidth={r.level === maxValue ? 1.5 : 1}
          strokeDasharray={r.level === maxValue ? "none" : "2 3"}
          opacity={0.6}
        />
      ))}

      {/* Axes lines */}
      {axesLines.map((l) => (
        <line key={l.i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--color-app-border)" strokeWidth={0.8} opacity={0.5} />
      ))}

      {/* Level labels on first axis */}
      {rings.map((r) => {
        const [, y] = point(0, r.level)
        return (
          <text
            key={r.level}
            x={cx + 4}
            y={y + 3}
            fontSize={9}
            fill="var(--color-app-muted)"
            opacity={0.6}
          >
            {r.level}
          </text>
        )
      })}

      {/* Data series polygons */}
      {series.map((s, si) => {
        const pts = axes.map((axis, i) => point(i, s.data[axis.key] ?? 0).join(",")).join(" ")
        return (
          <g key={s.label + si}>
            <polygon
              points={pts}
              fill={s.color}
              fillOpacity={s.opacity ?? 0.25}
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {axes.map((axis, i) => {
              const [x, y] = point(i, s.data[axis.key] ?? 0)
              return <circle key={axis.key + si} cx={x} cy={y} r={3.5} fill={s.color} />
            })}
          </g>
        )
      })}

      {/* Axis labels */}
      {labels.map(({ x, y, axis, a }) => {
        // Align text anchor based on angle
        const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end"
        return (
          <g key={axis.key}>
            <text
              x={x}
              y={y}
              fontSize={12}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="var(--color-app-text)"
              fontWeight={600}
            >
              {axis.emoji && <tspan>{axis.emoji} </tspan>}
              {axis.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Legend component (reutilizável)
export function RadarLegend({ series }: { series: RadarSeries[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {series.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
