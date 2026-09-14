import { type ApplicationDetailData } from "@/api/use-application-detail";
import { recentTasks } from "@/api/mappers/application";
import { type InstanceView, liveInstances } from "@/api/mappers/instance";
import type { Task } from "@/api/mappers/task";
import { AlertBanner, EmptyState } from "@/components/branded";
import { TaskList } from "@/components/tasks/task-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigTab } from "./config-tab";
import { InstancesTab } from "./instances-tab";
import { OverviewTab } from "./overview-tab";
import { ServicesTab } from "./services-tab";

export function ApplicationDetail({
  data,
  syncing,
  onSync,
  onSaveStackfilePath,
  onDisconnect,
  onOpenTask,
  onCancelTask,
  onOpenInstance,
}: {
  data: ApplicationDetailData;
  syncing: boolean;
  onSync: () => Promise<void>;
  onSaveStackfilePath: (path: string) => Promise<void>;
  onDisconnect: () => void;
  onOpenTask: (task: Task) => void;
  onCancelTask: (task: Task) => void;
  onOpenInstance: (instance: InstanceView) => void;
}) {
  const { detail, tasks, instances } = data;
  return (
    <div data-slot="application-detail" className="flex flex-col gap-6">
      {detail.validationError && <AlertBanner title={`Stackfile at ${detail.stackfilePath}`}>{detail.validationError}</AlertBanner>}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <OverviewTab
            detail={detail}
            tasks={recentTasks(tasks)}
            instances={liveInstances(instances)}
            syncing={syncing}
            onSync={onSync}
            onOpenTask={onOpenTask}
            onCancelTask={onCancelTask}
          />
        </TabsContent>
        <TabsContent value="services" className="pt-4">
          <ServicesTab services={detail.services} />
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          {tasks.length === 0 ? (
            <EmptyState title="No tasks yet" description="Start one with New task; the agent works it against this application." />
          ) : (
            <TaskList tasks={tasks} onOpen={onOpenTask} onCancel={onCancelTask} />
          )}
        </TabsContent>
        <TabsContent value="instances" className="pt-4">
          <InstancesTab instances={instances} onOpen={onOpenInstance} />
        </TabsContent>
        <TabsContent value="config" className="pt-4">
          <ConfigTab detail={detail} onSaveStackfilePath={onSaveStackfilePath} onDisconnect={onDisconnect} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
