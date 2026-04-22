"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteWeeklyAssessmentAction } from "@/app/actions/weekly-assessment.actions"

export function WeeklyActions({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function remove() {
    if (!confirm("Excluir esta avaliação semanal?")) return
    startTransition(async () => {
      const res = await deleteWeeklyAssessmentAction(id)
      if (!res.success) { alert(res.error); return }
      router.push("/avaliacoes")
      router.refresh()
    })
  }

  return (
    <button type="button" onClick={remove} disabled={pending} className="text-xs text-red-600 hover:underline">
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  )
}
