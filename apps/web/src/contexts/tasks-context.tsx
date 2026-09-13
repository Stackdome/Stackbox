import * as React from "react";
import { fetchApplications } from "@/api/applications";
import { toApplication, type Application } from "@/api/mappers/application";
import { toTask, type Task } from "@/api/mappers/task";
import { cancelTask, fetchTasks } from "@/api/tasks";
import { useCurrentUser } from "@/hooks/use-current-user";

export const TASKS_REFRESH_MS = 15_000;

export interface TasksValue {
  tasks: Task[];
  applications: Application[];
  needsYouCount: number;
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
  cancel: (taskId: string) => Promise<void>;
}

export const TasksContext = React.createContext<TasksValue | undefined>(undefined);

type Loaded = Pick<TasksValue, "tasks" | "applications" | "needsYouCount">;

const NOTHING_LOADED: Loaded = { tasks: [], applications: [], needsYouCount: 0 };

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { organisationId } = useCurrentUser();
  const [loaded, setLoaded] = React.useState<Loaded>(NOTHING_LOADED);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!organisationId) {
      setLoaded(NOTHING_LOADED);
      setLoading(false);
      return;
    }
    try {
      const [list, applications] = await Promise.all([fetchTasks(organisationId), fetchApplications(organisationId)]);
      setLoaded({
        tasks: list.items.map(toTask),
        applications: applications.items.map(toApplication),
        needsYouCount: list.needs_you_count,
      });
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [organisationId]);

  React.useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, TASKS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const cancel = React.useCallback(
    async (taskId: string) => {
      if (!organisationId) return;
      await cancelTask(organisationId, taskId);
      await refresh();
    },
    [organisationId, refresh],
  );

  const value = React.useMemo<TasksValue>(
    () => ({ ...loaded, loading, failed, refresh, cancel }),
    [loaded, loading, failed, refresh, cancel],
  );
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}
