import { RepoProvider } from "@stackbox/contract";
import { useState } from "react";
import { type GitConnectionView, PROVIDER_LABEL, type RepositoryView } from "@/api/mappers/repository";
import { useRepositories } from "@/api/use-repositories";
import { EmptyState, NoConnectionGlyph, PageHeader, SearchField, SearchGlyph, useConfirm } from "@/components/branded";
import { AddRepositoriesDrawer } from "@/components/repositories/add-repositories-drawer";
import { ConnectProviderDrawer } from "@/components/repositories/connect-provider-drawer";
import { ConnectionSection } from "@/components/repositories/connection-section";
import { ALL_PROVIDERS, NO_REPOSITORY_FILTER, type RepositoriesFilter, filterRepositories } from "@/components/repositories/filter-repositories";
import { type BlockedRemove, RemoveBlockedDialog } from "@/components/repositories/remove-blocked-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

function RepositoriesToolbar({ filter, onFilterChange }: { filter: RepositoriesFilter; onFilterChange: (filter: RepositoriesFilter) => void }) {
  return (
    <div className="flex w-full items-center gap-2">
      <SearchField value={filter.q} onChange={(q) => onFilterChange({ ...filter, q })} placeholder="Search repositories" label="Search repositories" className="w-60" />
      <Select value={filter.provider} onValueChange={(provider) => onFilterChange({ ...filter, provider: provider as RepositoriesFilter["provider"] })}>
        <SelectTrigger aria-label="Provider" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROVIDERS}>All providers</SelectItem>
          {Object.values(RepoProvider).map((provider) => (
            <SelectItem key={provider} value={provider}>
              {PROVIDER_LABEL[provider]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RepositoriesPage() {
  const { organisationId } = useCurrentUser();
  const confirm = useConfirm();
  const { connections, repositories, loading, failed, refresh, connect, verify, available, add, remove } = useRepositories(organisationId);
  const [filter, setFilter] = useState<RepositoriesFilter>(NO_REPOSITORY_FILTER);
  const [connectOpen, setConnectOpen] = useState(false);
  const [adding, setAdding] = useState<GitConnectionView | null>(null);
  const [blocked, setBlocked] = useState<BlockedRemove | null>(null);
  const groups = filterRepositories(connections, repositories, filter);

  async function askToRemove(repository: RepositoryView) {
    if (repository.usedBy.length > 0) {
      setBlocked({ repository, applications: repository.usedBy });
      return;
    }
    const confirmed = await confirm({
      title: `Remove ${repository.fullName}?`,
      description: "No application can be connected to it until it is added again.",
      confirmLabel: "Remove repository",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const blocking = await remove(repository.id);
      if (blocking) setBlocked({ repository, applications: blocking });
    } catch {
      toast({ title: "The repository was not removed" });
    }
  }

  async function reconnect(connection: GitConnectionView) {
    try {
      await verify(connection.id);
    } catch {
      toast({ title: `${connection.title} was not verified` });
    }
  }

  function body() {
    if (loading) return <Skeleton className="h-64" />;
    if (failed && connections.length === 0) {
      return (
        <EmptyState
          title="Repositories did not load"
          description="Check the connection and try again."
          action={<Button variant="ghost" onClick={() => void refresh()}>Try again</Button>}
        />
      );
    }
    if (connections.length === 0) {
      return (
        <EmptyState
          icon={<NoConnectionGlyph />}
          title="Connect a git provider"
          description="Repositories feed applications. Connect GitHub or GitLab, then add the repositories your applications build from."
          action={<Button variant="outline" onClick={() => setConnectOpen(true)}>Connect provider</Button>}
        />
      );
    }
    if (groups.length === 0) {
      return (
        <EmptyState
          icon={<SearchGlyph />}
          title="No repositories match"
          description="Try another name or provider."
          action={<Button variant="ghost" onClick={() => setFilter(NO_REPOSITORY_FILTER)}>Clear filters</Button>}
        />
      );
    }
    return (
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <ConnectionSection
            key={group.connection.id}
            connection={group.connection}
            repositories={group.repositories}
            onAdd={() => setAdding(group.connection)}
            onReconnect={() => void reconnect(group.connection)}
            onRemove={(repository) => void askToRemove(repository)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        actions={<Button onClick={() => setConnectOpen(true)}>Connect provider</Button>}
        toolbar={connections.length > 0 ? <RepositoriesToolbar filter={filter} onFilterChange={setFilter} /> : undefined}
      />
      {body()}
      <ConnectProviderDrawer open={connectOpen} onOpenChange={setConnectOpen} onConnect={connect} />
      {adding && (
        <AddRepositoriesDrawer
          connection={adding}
          loadAvailable={available}
          onAdd={(externalIds) => add(adding.id, externalIds)}
          onOpenChange={(open) => {
            if (!open) setAdding(null);
          }}
        />
      )}
      <RemoveBlockedDialog blocked={blocked} onClose={() => setBlocked(null)} />
    </>
  );
}
