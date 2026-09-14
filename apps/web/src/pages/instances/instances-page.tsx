import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { InstanceView } from "@/api/mappers/instance";
import { useApplications } from "@/api/use-applications";
import { useInstances, useSpinUp } from "@/api/use-instances";
import { EmptyState, PageHeader, SearchGlyph, StackArchitectureGlyph, ViewToggle, useViewMode } from "@/components/branded";
import { DEFAULT_INSTANCE_FILTER, type InstanceFilter, filterInstances, isFiltered } from "@/components/instances/filter-instances";
import { InstanceCards } from "@/components/instances/instance-cards";
import { InstanceFilters } from "@/components/instances/instance-filters";
import { InstanceList } from "@/components/instances/instance-list";
import { SpinUpDrawer } from "@/components/instances/spin-up-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES, instancePath } from "@/lib/routes";

export const INSTANCES_VIEW_PAGE = "instances";

export function InstancesPage() {
  const { organisationId } = useCurrentUser();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<InstanceFilter>(DEFAULT_INSTANCE_FILTER);
  const { instances, loading, failed, refresh } = useInstances(organisationId, { includeTornDown: filter.showTornDown });
  const { applications } = useApplications(organisationId);
  const spinUp = useSpinUp(organisationId);
  const [view, setView] = useViewMode(INSTANCES_VIEW_PAGE);
  const [spinUpOpen, setSpinUpOpen] = useState(false);
  const visible = filterInstances(instances, filter);
  const now = Date.now();
  const open = (instance: InstanceView) => navigate(instancePath(instance.id));

  function body() {
    if (loading) return <Skeleton className="h-64" />;
    if (failed && instances.length === 0) {
      return (
        <EmptyState
          title="Application Instances did not load"
          description="Check the connection and try again."
          action={<Button variant="ghost" onClick={() => void refresh()}>Try again</Button>}
        />
      );
    }
    if (instances.length === 0 && !isFiltered(filter)) {
      return (
        <EmptyState
          icon={<StackArchitectureGlyph />}
          title="No Application Instances yet"
          description="Instances appear when a task prepares one or when you spin one up."
          action={
            applications.length === 0 ? (
              <Button asChild variant="outline">
                <Link to={ROUTES.applications}>Connect an application</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setSpinUpOpen(true)}>
                Spin up
              </Button>
            )
          }
        />
      );
    }
    if (visible.length === 0) {
      return (
        <EmptyState
          icon={<SearchGlyph />}
          title="No instances match"
          description="Try another search, application, purpose or status."
          action={<Button variant="ghost" onClick={() => setFilter({ ...DEFAULT_INSTANCE_FILTER, showTornDown: filter.showTornDown })}>Clear filters</Button>}
        />
      );
    }
    return view === "cards" ? <InstanceCards instances={visible} now={now} onOpen={open} /> : <InstanceList instances={visible} now={now} onOpen={open} />;
  }

  return (
    <>
      <PageHeader
        actions={<Button onClick={() => setSpinUpOpen(true)}>Spin up</Button>}
        toolbar={
          <div className="flex w-full items-center gap-2">
            <InstanceFilters filter={filter} onChange={setFilter} applications={applications} />
            <div className="ml-auto">
              <ViewToggle value={view} onValueChange={setView} />
            </div>
          </div>
        }
      />
      {body()}
      {spinUpOpen && (
        <SpinUpDrawer
          open
          onOpenChange={setSpinUpOpen}
          applications={applications}
          onSubmit={async (draft) => {
            const id = await spinUp(draft);
            setSpinUpOpen(false);
            navigate(instancePath(id));
          }}
        />
      )}
    </>
  );
}
