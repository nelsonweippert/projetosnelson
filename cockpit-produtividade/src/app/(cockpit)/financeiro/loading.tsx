export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-cockpit-border rounded-xl" />
          <div className="h-3 w-24 bg-cockpit-border-light rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-cockpit-border rounded-xl" />
          <div className="h-10 w-28 bg-cockpit-border rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="cockpit-card space-y-3">
            <div className="w-8 h-8 rounded-xl bg-cockpit-border" />
            <div className="h-6 w-20 bg-cockpit-border rounded" />
            <div className="h-3 w-16 bg-cockpit-border-light rounded" />
          </div>
        ))}
      </div>
      <div className="cockpit-card !p-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-cockpit-border-light">
            <div className="w-7 h-7 rounded-lg bg-cockpit-border flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/2 bg-cockpit-border rounded" />
              <div className="h-3 w-24 bg-cockpit-border-light rounded" />
            </div>
            <div className="h-4 w-20 bg-cockpit-border rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
