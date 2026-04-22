"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteAssessmentAction } from "@/app/actions/assessment.actions"

export function AssessmentActions({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function remove() {
    if (!confirm("Excluir esta avaliação? Essa ação não pode ser desfeita.")) return
    startTransition(async () => {
      const res = await deleteAssessmentAction(id)
      if (!res.success) { alert(res.error); return }
      router.push("/avaliacoes")
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={remove}
      className="text-xs text-red-600 hover:underline"
      disabled={pending}
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  )
}
