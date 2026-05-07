export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      <div className="h-10 w-32 bg-cockpit-border-light rounded-lg" />
      <div className="h-32 bg-cockpit-border-light rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-cockpit-border-light rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-cockpit-border-light rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
