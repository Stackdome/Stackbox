import { StackfileSync } from "@stackbox/contract";
import type { ApplicationDetailView } from "@/api/mappers/application";
import type { InstanceView } from "@/api/mappers/instance";
import type { Task } from "@/api/mappers/task";
import { TaskRow } from "@/components/tasks/task-row";
import { LiveInstances } from "./live-instances";
import { ServiceStrip } from "./service-strip";
import { StackfileCard } from "./stackfile-card";

export function OverviewTab({
  detail,
  tasks,
  instances,
  syncing,
  onSync,
  onOpenTask,
  onCancelTask,
}: {
  detail: ApplicationDetailView;
  tasks: Task[];
  instances: InstanceView[];
  syncing: boolean;
  onSync: () => Promise<void>;
  onOpenTask: (task: Task) => void;
  onCancelTask: (task: Task) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
      <section aria-label="Services" className="flex flex-col gap-3">
        <h2 className="text-name font-medium">Services</h2>
        <ServiceStrip services={detail.services} stale={detail.sync.status === StackfileSync.Stale} />
      </section>
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-label="Recent tasks" className="flex flex-col gap-3">
          <h2 className="text-name font-medium">Recent tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-body text-fg-muted">No tasks yet</p>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={onOpenTask} onCancel={onCancelTask} />)
          )}
        </section>
        <LiveInstances instances={instances} />
        <StackfileCard detail={detail} syncing={syncing} onSync={onSync} />
      </div>
    </div>
  );
}
