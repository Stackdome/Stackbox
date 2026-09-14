import type { GitConnectionView, RepositoryView } from "@/api/mappers/repository";
import { DataListHeader, ProviderLogo, StatusText } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { REPOSITORY_COLUMNS, REPOSITORY_LABELS, RepositoryRow } from "./repository-row";

export function ConnectionSection({
  connection,
  repositories,
  onAdd,
  onReconnect,
  onRemove,
}: {
  connection: GitConnectionView;
  repositories: RepositoryView[];
  onAdd: () => void;
  onReconnect: () => void;
  onRemove: (repository: RepositoryView) => void;
}) {
  return (
    <section aria-label={connection.title} className="flex flex-col gap-2">
      <header className="flex items-center gap-3 px-2">
        <ProviderLogo providerId={connection.logo} className="size-5" />
        <h2 className="text-name font-medium">{connection.accountLogin}</h2>
        <StatusText domain="git_connection" state={connection.status} icon />
        {connection.statusLine && <span className="text-meta text-fg-muted">{connection.statusLine}</span>}
        <div className="ml-auto flex items-center gap-2">
          {connection.needsReauth && (
            <Button variant="outline" size="sm" onClick={onReconnect}>
              Reconnect
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onAdd}>
            Add repositories
          </Button>
        </div>
      </header>
      <DataListHeader columns={REPOSITORY_COLUMNS} labels={REPOSITORY_LABELS} />
      {repositories.length === 0 ? (
        <p className="flex h-16 items-center px-2 text-body text-fg-muted">No repositories added yet</p>
      ) : (
        repositories.map((repository) => <RepositoryRow key={repository.id} repository={repository} onRemove={onRemove} />)
      )}
    </section>
  );
}
