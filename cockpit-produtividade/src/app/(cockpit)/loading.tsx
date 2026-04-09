export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-cockpit-border rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="cockpit-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cockpit-border" />
            <div className="h-7 w-24 bg-cockpit-border rounded-lg" />
            <div className="h-3 w-32 bg-cockpit-border rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="cockpit-card space-y-4">
            <div className="h-4 w-40 bg-cockpit-border rounded" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="space-y-1.5">
                <div className="h-3 w-full bg-cockpit-border rounded" />
                <div className="h-1.5 w-full bg-cockpit-border-light rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
