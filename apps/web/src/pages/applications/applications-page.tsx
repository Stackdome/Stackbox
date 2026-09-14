import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ApplicationListView } from "@/api/mappers/application";
import { useApplications } from "@/api/use-applications";
import { ApplicationCards } from "@/components/applications/application-cards";
import { ApplicationList } from "@/components/applications/application-list";
import { filterApplications } from "@/components/applications/filter-applications";
import { EmptyState, PageHeader, SearchField, SearchGlyph, StackArchitectureGlyph, ViewToggle, useViewMode } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES, applicationPath } from "@/lib/routes";

export const APPLICATIONS_VIEW_PAGE = "applications";

export function ApplicationsPage() {
  const { organisationId } = useCurrentUser();
  const { applications, loading, failed, refresh } = useApplications(organisationId);
  const [q, setQ] = useState("");
  const [view, setView] = useViewMode(APPLICATIONS_VIEW_PAGE);
  const navigate = useNavigate();
  const visible = filterApplications(applications, q);
  const open = (application: ApplicationListView) => navigate(applicationPath(application.id));

  function body() {
    if (loading) return <Skeleton className="h-64" />;
    if (failed && applications.length === 0) {
      return (
        <EmptyState
          title="Applications did not load"
          description="Check the connection and try again."
          action={<Button variant="ghost" onClick={() => void refresh()}>Try again</Button>}
        />
      );
    }
    if (applications.length === 0) {
      return (
        <EmptyState
          icon={<StackArchitectureGlyph />}
          title="Connect your first application"
          description="An application is one repository plus its Stackfile. Stackbox reads the Stackfile to find the services it runs."
          action={
            <Button asChild variant="outline">
              <Link to={ROUTES.newApplication}>Connect application</Link>
            </Button>
          }
        />
      );
    }
    if (visible.length === 0) {
      return (
        <EmptyState
          icon={<SearchGlyph />}
          title="No applications match"
          description="Try another name, repository or service."
          action={<Button variant="ghost" onClick={() => setQ("")}>Clear search</Button>}
        />
      );
    }
    return view === "cards" ? <ApplicationCards applications={visible} onOpen={open} /> : <ApplicationList applications={visible} onOpen={open} />;
  }

  return (
    <>
      <PageHeader
        actions={
          <Button asChild>
            <Link to={ROUTES.newApplication}>Connect application</Link>
          </Button>
        }
        toolbar={
          applications.length > 0 ? (
            <div className="flex w-full items-center gap-2">
              <SearchField value={q} onChange={setQ} placeholder="Search applications" label="Search applications" className="w-60" />
              <div className="ml-auto">
                <ViewToggle value={view} onValueChange={setView} />
              </div>
            </div>
          ) : undefined
        }
      />
      {body()}
    </>
  );
}
