import { auth } from "@/lib/auth"
import { getTasks } from "@/services/task.service"
import { TasksClient } from "./TasksClient"

export default async function TarefasPage() {
  const session = await auth()
  const tasks = await getTasks(session?.user?.id!)
  return <TasksClient initialTasks={tasks} />
}
