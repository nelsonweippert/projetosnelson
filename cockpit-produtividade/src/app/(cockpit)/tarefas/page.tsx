import { auth } from "@/lib/auth"
import { getTasks } from "@/services/task.service"
import { getAreas } from "@/services/area.service"
import { TasksClient } from "./TasksClient"

export default async function TarefasPage() {
  const session = await auth()
  const userId = session?.user?.id!
  const [tasks, areas] = await Promise.all([getTasks(userId), getAreas(userId)])
  return <TasksClient initialTasks={tasks} areas={areas} />
}
