import { MoreHorizontal } from "lucide-react";
import { NOT_USED_LABEL, type RepositoryView } from "@/api/mappers/repository";
import { DataListActions, DataListCell, DataListName, DataListRow, absoluteAge, relativeAge } from "@/components/branded";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const REPOSITORY_COLUMNS = "grid-cols-[minmax(200px,1fr)_120px_minmax(160px,1fr)_96px_32px]";

export const REPOSITORY_LABELS = ["Repository", "Default branch", "Used by", "Added", ""];

export function RepositoryRow({ repository, onRemove }: { repository: RepositoryView; onRemove: (repository: RepositoryView) => void }) {
  return (
    <DataListRow columns={REPOSITORY_COLUMNS}>
      <DataListName name={repository.fullName} mono />
      <DataListCell mono>{repository.defaultBranch}</DataListCell>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {repository.usedBy.length === 0 ? (
          <span className="text-meta text-fg-muted">{NOT_USED_LABEL}</span>
        ) : (
          repository.usedBy.map((application) => (
            <Badge key={application.id} variant="secondary">
              {application.name}
            </Badge>
          ))
        )}
      </div>
      <DataListCell numeric title={absoluteAge(repository.addedAt) ?? undefined}>
        {relativeAge(repository.addedAt)}
      </DataListCell>
      <DataListActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${repository.fullName}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={repository.providerUrl} target="_blank" rel="noreferrer">
                Open in provider
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(repository)}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DataListActions>
    </DataListRow>
  );
}
