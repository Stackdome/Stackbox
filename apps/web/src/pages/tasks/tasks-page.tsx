import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cancelTaskErrorMessage } from "@/api/errors";
import type { Task } from "@/api/mappers/task";
import { EmptyState, PageHeader, SearchGlyph, useConfirm } from "@/components/branded";
import { NO_FILTER, filterTasks, type TasksFilter } from "@/components/tasks/filter-tasks";
import { NewTaskDrawer } from "@/components/tasks/new-task-drawer";
import { TaskList, TaskListSkeleton } from "@/components/tasks/task-list";
import { TasksEmptyState } from "@/components/tasks/tasks-empty-state";
import { TasksToolbar } from "@/components/tasks/tasks-toolbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTasks } from "@/hooks/use-tasks";
import { ROUTES, taskPath } from "@/lib/routes";

export function TasksPage({ newTaskOpen = false }: { newTaskOpen?: boolean }) {
  const { tasks, applications, loading, failed, refresh, cancel, create, uploadScreenshot } = useTasks();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<TasksFilter>(NO_FILTER);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const visible = filterTasks(tasks, filter);

  async function askToCancel(task: Task) {
    const confirmed = await confirm({
      title: "Cancel this task?",
      description: `The agent stops working on "${task.title}". This cannot be undone.`,
      confirmLabel: "Cancel task",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await cancel(task.id);
    } catch (error) {
      toast({ title: cancelTaskErrorMessage(error) });
    }
  }

  function body() {
    if (loading) return <TaskListSkeleton />;
    if (failed && tasks.length === 0) {
      return (
        <EmptyState
          title="Tasks did not load"
          description="Check the connection and try again."
          action={<Button variant="ghost" onClick={() => void refresh()}>Try again</Button>}
        />
      );
    }
    if (tasks.length === 0) return <TasksEmptyState hasApplications={applications.length > 0} />;
    if (visible.length === 0) {
      return (
        <EmptyState
          icon={<SearchGlyph />}
          title="No tasks match"
          description="Try another status, application or search."
          action={<Button variant="ghost" onClick={() => setFilter(NO_FILTER)}>Clear filters</Button>}
        />
      );
    }
    return <TaskList tasks={visible} onOpen={(task) => navigate(taskPath(task.id))} onCancel={askToCancel} />;
  }

  return (
    <>
      <PageHeader
        actions={
          <Button asChild>
            <Link to={ROUTES.newTask}>New task</Link>
          </Button>
        }
        toolbar={
          tasks.length > 0 ? (
            <TasksToolbar filter={filter} onFilterChange={setFilter} applications={applications} />
          ) : undefined
        }
      />
      {body()}
      {newTaskOpen && (
        <NewTaskDrawer
          open
          onOpenChange={(open) => {
            if (!open) navigate(ROUTES.tasks);
          }}
          applications={applications}
          reporterName={user?.name ?? ""}
          onUpload={uploadScreenshot}
          onSubmit={async (draft) => {
            await create(draft);
            navigate(ROUTES.tasks);
          }}
        />
      )}
    </>
  );
}
