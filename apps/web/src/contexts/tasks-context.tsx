import * as React from "react";
import { fetchApplications } from "@/api/applications";
import { uploadScreenshot as uploadScreenshotFile } from "@/api/artifacts";
import { toApplication, type Application } from "@/api/mappers/application";
import { type NewTaskDraft, toTaskCreate } from "@/api/mappers/new-task";
import { toTask, type Task } from "@/api/mappers/task";
import { type ArtifactView, toArtifact } from "@/api/mappers/task-detail";
import { cancelTask, createTask, fetchTasks } from "@/api/tasks";
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
  create: (draft: NewTaskDraft) => Promise<string>;
  uploadScreenshot: (file: File) => Promise<ArtifactView>;
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
    // Independent calls: an applications failure must not hide an already-loaded task list.
    const [tasksResult, applicationsResult] = await Promise.allSettled([
      fetchTasks(organisationId),
      fetchApplications(organisationId),
    ]);
    if (tasksResult.status === "fulfilled") {
      const list = tasksResult.value;
      setLoaded((previous) => ({
        tasks: list.items.map(toTask),
        applications: applicationsResult.status === "fulfilled" ? applicationsResult.value.items.map(toApplication) : previous.applications,
        needsYouCount: list.needs_you_count,
      }));
      setFailed(false);
    } else {
      setFailed(true);
    }
    setLoading(false);
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

  const create = React.useCallback(
    async (draft: NewTaskDraft) => {
      if (!organisationId) throw new Error("no organization to create the task in");
      const created = await createTask(organisationId, toTaskCreate(draft));
      await refresh();
      return created.id;
    },
    [organisationId, refresh],
  );

  const uploadScreenshot = React.useCallback(
    async (file: File) => {
      if (!organisationId) throw new Error("no organization to upload the screenshot to");
      return toArtifact(await uploadScreenshotFile(organisationId, file));
    },
    [organisationId],
  );

  const value = React.useMemo<TasksValue>(
    () => ({ ...loaded, loading, failed, refresh, cancel, create, uploadScreenshot }),
    [loaded, loading, failed, refresh, cancel, create, uploadScreenshot],
  );
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}
