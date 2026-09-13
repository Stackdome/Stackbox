import { Link } from "react-router-dom";
import { EmptyState } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export function TasksEmptyState({ hasApplications }: { hasApplications: boolean }) {
  return hasApplications ? (
    <EmptyState
      title="No tasks yet"
      description="Report a bug and the agent reproduces it, fixes it and opens a pull request."
      action={
        <Button asChild variant="outline">
          <Link to={ROUTES.newTask}>New task</Link>
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="No tasks yet"
      description="A task runs against an application. Connect one to report the first bug."
      action={
        <Button asChild variant="outline">
          <Link to={ROUTES.applications}>Connect an application first</Link>
        </Button>
      }
    />
  );
}
