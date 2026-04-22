"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { generateMonthlyFromWeeksAction } from "@/app/actions/monthly-from-weeks.action"

export function GenerateMonthlyButton({ studentId, referenceMonth }: { studentId: string; referenceMonth: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function run() {
    setError("")
    startTransition(async () => {
      const res = await generateMonthlyFromWeeksAction({ studentId, referenceMonth })
      if (!res.success) { setError(res.error); return }
      const data = res.data as { id: string }
      router.push(`/avaliacoes/${data.id}`)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={pending} className="app-btn-primary text-xs">
        {pending ? "Consolidando (30-60s)..." : "✨ Consolidar com IA"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  )
}
