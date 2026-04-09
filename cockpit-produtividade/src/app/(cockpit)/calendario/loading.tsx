export default function CalendarioLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-cockpit-border-light rounded-xl" />
        <div className="h-10 w-32 bg-cockpit-border-light rounded-xl" />
      </div>
      <div className="cockpit-card">
        <div className="h-6 w-48 bg-cockpit-border-light rounded mb-6" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-cockpit-border-light rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
