import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { cancelTaskErrorMessage, disconnectApplicationErrorMessage } from "@/api/errors";
import type { Task } from "@/api/mappers/task";
import { useApplicationDetail } from "@/api/use-application-detail";
import { useSpinUp } from "@/api/use-instances";
import { ApplicationDetail } from "@/components/application-detail/application-detail";
import { SyncStatus } from "@/components/applications/sync-status";
import { EmptyState, PageHeader, useConfirm } from "@/components/branded";
import { SpinUpDrawer } from "@/components/instances/spin-up-drawer";
import { NewTaskDrawer } from "@/components/tasks/new-task-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTasks } from "@/hooks/use-tasks";
import { ROUTES, instancePath, taskPath } from "@/lib/routes";

export function ApplicationDetailPage() {
  const { applicationId = "" } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { organisationId, user } = useCurrentUser();
  const { applications, create: createTask, uploadScreenshot, cancel: cancelTask } = useTasks();
  const { setCustomLabel, registerRename } = useBreadcrumb();
  const { data, loading, syncing, refresh, rename, setStackfilePath, sync, remove } = useApplicationDetail(organisationId, applicationId);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [spinUpOpen, setSpinUpOpen] = useState(false);
  const spinUp = useSpinUp(organisationId);

  useEffect(() => {
    if (data) setCustomLabel(pathname, data.detail.name);
  }, [data, pathname, setCustomLabel]);

  useEffect(() => registerRename(pathname, rename), [pathname, registerRename, rename]);

  async function askToCancel(task: Task) {
    const confirmed = await confirm({
      title: "Cancel this task?",
      description: `The agent stops working on "${task.title}". This cannot be undone.`,
      confirmLabel: "Cancel task",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await cancelTask(task.id);
      await refresh();
    } catch (error) {
      toast({ title: cancelTaskErrorMessage(error) });
    }
  }

  async function askToDisconnect() {
    if (!data) return;
    const confirmed = await confirm({
      title: `Disconnect ${data.detail.name}?`,
      description: "Its services, tasks and their evidence are deleted. The repository stays connected.",
      confirmLabel: "Disconnect application",
      variant: "destructive",
      gate: { kind: "retype", name: data.detail.slug },
      onConfirm: async () => {
        try {
          await remove();
          return null;
        } catch (error) {
          return disconnectApplicationErrorMessage(error);
        }
      },
    });
    if (confirmed) navigate(ROUTES.applications);
  }

  if (loading) return <Skeleton className="h-64" />;
  if (!data) {
    return (
      <EmptyState
        title="This application did not load"
        description="Check the connection and try again."
        action={<Button variant="ghost" onClick={() => void refresh()}>Try again</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        identity={<span className="font-mono text-meta text-fg-muted">{data.detail.slug}</span>}
        status={<SyncStatus sync={data.detail.sync} />}
        actions={
          <>
            <Button variant="outline" onClick={() => setSpinUpOpen(true)}>
              Spin up
            </Button>
            <Button onClick={() => setNewTaskOpen(true)}>New task</Button>
          </>
        }
      />
      <ApplicationDetail
        data={data}
        syncing={syncing}
        onSync={() =>
          sync().catch(() => {
            toast({ title: "The Stackfile was not re-synced" });
          })
        }
        onSaveStackfilePath={setStackfilePath}
        onDisconnect={() => void askToDisconnect()}
        onOpenTask={(task) => navigate(taskPath(task.id))}
        onCancelTask={(task) => void askToCancel(task)}
        onOpenInstance={(instance) => navigate(instancePath(instance.id))}
      />
      {spinUpOpen && (
        <SpinUpDrawer
          open
          onOpenChange={setSpinUpOpen}
          applications={[{ id: data.detail.id, name: data.detail.name, defaultBranch: data.detail.repository.defaultBranch }]}
          initial={{ application: { id: data.detail.id, name: data.detail.name, defaultBranch: data.detail.repository.defaultBranch }, locked: true }}
          onSubmit={async (draft) => {
            const id = await spinUp(draft);
            setSpinUpOpen(false);
            navigate(instancePath(id));
          }}
        />
      )}
      {newTaskOpen && (
        <NewTaskDrawer
          open
          onOpenChange={setNewTaskOpen}
          applications={applications}
          reporterName={user?.name ?? ""}
          lockedApplicationId={data.detail.id}
          onUpload={uploadScreenshot}
          onSubmit={async (draft) => {
            await createTask(draft);
            setNewTaskOpen(false);
            await refresh();
          }}
        />
      )}
    </>
  );
}
