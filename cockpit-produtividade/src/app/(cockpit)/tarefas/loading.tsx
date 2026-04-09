export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-cockpit-border rounded-xl" />
          <div className="h-3 w-24 bg-cockpit-border-light rounded" />
        </div>
        <div className="h-10 w-32 bg-cockpit-border rounded-xl" />
      </div>
      <div className="h-9 w-80 bg-cockpit-border rounded-xl" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="cockpit-card flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-cockpit-border flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 bg-cockpit-border rounded" />
              <div className="flex gap-2">
                <div className="h-3 w-16 bg-cockpit-border-light rounded-full" />
                <div className="h-3 w-20 bg-cockpit-border-light rounded-full" />
              </div>
            </div>
            <div className="h-6 w-16 bg-cockpit-border rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
