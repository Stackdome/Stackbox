import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Task } from "@/api/mappers/task";
import { EmptyState, PageHeader, SearchGlyph, useConfirm } from "@/components/branded";
import { NO_FILTER, filterTasks, type TasksFilter } from "@/components/tasks/filter-tasks";
import { TaskList, TaskListSkeleton } from "@/components/tasks/task-list";
import { TasksEmptyState } from "@/components/tasks/tasks-empty-state";
import { TasksToolbar } from "@/components/tasks/tasks-toolbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useTasks } from "@/hooks/use-tasks";
import { ROUTES, taskPath } from "@/lib/routes";

export function TasksPage() {
  const { tasks, applications, loading, failed, refresh, cancel } = useTasks();
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
    } catch {
      toast({ title: "The task was not cancelled" });
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
    </>
  );
}
