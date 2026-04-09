export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-cockpit-border rounded-xl" />
        <div className="h-3 w-64 bg-cockpit-border-light rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="cockpit-card space-y-4">
            <div className="h-4 w-36 bg-cockpit-border rounded" />
            <div className="h-3 w-full bg-cockpit-border-light rounded" />
            <div className="h-3 w-3/4 bg-cockpit-border-light rounded" />
            <div className="h-10 w-full bg-cockpit-border rounded-xl" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-40 bg-cockpit-border rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="cockpit-card space-y-3">
            <div className="flex gap-2">
              <div className="h-5 w-28 bg-cockpit-border-light rounded-full" />
              <div className="h-5 w-20 bg-cockpit-border-light rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-cockpit-border-light rounded" />
              <div className="h-3 w-5/6 bg-cockpit-border-light rounded" />
              <div className="h-3 w-4/6 bg-cockpit-border-light rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
