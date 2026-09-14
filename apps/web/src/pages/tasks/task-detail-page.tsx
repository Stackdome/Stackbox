import { detailColumnsClass } from "@/components/task-detail/layout";
import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTaskDetail } from "@/api/use-task-detail";
import { EmptyState, PageHeader, StatusPill } from "@/components/branded";
import { statusVariant } from "@/components/branded/status-variant";
import { TaskDetail } from "@/components/task-detail/task-detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTasks } from "@/hooks/use-tasks";

export function TaskDetailPage() {
  const { taskId = "" } = useParams();
  const { pathname } = useLocation();
  const { organisationId } = useCurrentUser();
  const { refresh: refreshTasks } = useTasks();
  const { setCustomLabel } = useBreadcrumb();
  const { data, loading, refresh, reply } = useTaskDetail(organisationId, taskId);

  useEffect(() => {
    if (data) setCustomLabel(pathname, data.detail.title);
  }, [data, pathname, setCustomLabel]);

  async function sendReply(body: string) {
    await reply(body);
    await refreshTasks();
  }

  if (loading) {
    return (
      <div className={detailColumnsClass}>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!data) {
    return (
      <EmptyState
        title="This task did not load"
        description="Check the connection and try again."
        action={<Button variant="ghost" onClick={() => void refresh()}>Try again</Button>}
      />
    );
  }
  return (
    <>
      <PageHeader status={<StatusPill variant={statusVariant("task", data.detail.status)}>{data.detail.statusLabel}</StatusPill>} />
      <TaskDetail data={data} onReply={sendReply} />
    </>
  );
}
