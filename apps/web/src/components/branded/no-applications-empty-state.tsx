import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { EmptyState } from "./empty-state";

interface NoApplicationsEmptyStateProps {
  title: string;
  description: string;
}

/** A drawer that needs an application to act on and finds none: same detour, same link, whatever action asked for it. */
export function NoApplicationsEmptyState({ title, description }: NoApplicationsEmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Button asChild variant="outline">
          <Link to={ROUTES.applications}>Connect an application first</Link>
        </Button>
      }
    />
  );
}
