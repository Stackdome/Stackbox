import type { Task } from "@/api/mappers/task";
import { DataListHeader, DataListSkeleton } from "@/components/branded";
import { TASK_COLUMNS, TaskRow } from "./task-row";

const LABELS = ["", "Task", "Status", "Application", "Runs", "Pull request", "Age", ""];

export function TaskList({
  tasks,
  onOpen,
  onCancel,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onCancel: (task: Task) => void;
}) {
  return (
    <div data-slot="task-list">
      <DataListHeader columns={TASK_COLUMNS} labels={LABELS} />
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onOpen={onOpen} onCancel={onCancel} />
      ))}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div data-slot="task-list">
      <DataListHeader columns={TASK_COLUMNS} labels={LABELS} />
      <DataListSkeleton
        columns={TASK_COLUMNS}
        rows={5}
        shape={[
          { w: 16, h: 4 },
          [{ w: 240, h: 4 }, { w: 160, h: 3 }],
          { w: 80, h: 3 },
          { w: 64, h: 3 },
          { w: 56, h: 3 },
          { w: 64, h: 3 },
          { w: 40, h: 3 },
          null,
        ]}
      />
    </div>
  );
}
