import type { CoarseStatus } from "@stackbox/contract";
import type { Task } from "@/api/mappers/task";

export const ALL = "all";

export type TasksFilter = { status: CoarseStatus | typeof ALL; applicationId: string; q: string };

export const NO_FILTER: TasksFilter = { status: ALL, applicationId: ALL, q: "" };

export function filterTasks(tasks: Task[], filter: TasksFilter): Task[] {
  const q = filter.q.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (filter.status === ALL || task.status === filter.status) &&
      (filter.applicationId === ALL || task.application.id === filter.applicationId) &&
      (q === "" || task.title.toLowerCase().includes(q) || task.application.name.toLowerCase().includes(q)),
  );
}
