export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 bg-cockpit-border rounded-xl" />
          <div className="h-3 w-48 bg-cockpit-border-light rounded" />
        </div>
        <div className="h-10 w-32 bg-cockpit-border rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="cockpit-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cockpit-border flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-24 bg-cockpit-border rounded" />
                <div className="h-3 w-32 bg-cockpit-border-light rounded" />
              </div>
            </div>
            <div className="h-1 w-full bg-cockpit-border-light rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
