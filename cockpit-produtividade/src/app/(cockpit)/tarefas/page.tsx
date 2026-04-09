import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTasks } from "@/services/task.service"
import { getAreas } from "@/services/area.service"
import { TasksClient } from "./TasksClient"

export default async function TarefasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const [tasks, areas] = await Promise.all([
    getTasks(session.user.id).catch(() => []),
    getAreas(session.user.id).catch(() => []),
  ])
  return <TasksClient initialTasks={tasks} areas={areas} />
}
