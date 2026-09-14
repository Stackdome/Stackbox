import type { SyncView } from "@/api/mappers/application";
import { StatusText } from "@/components/branded";

export function SyncStatus({ sync }: { sync: SyncView }) {
  return (
    <div className="flex min-w-0 flex-col">
      <StatusText domain="stackfile_sync" state={sync.status} />
      {sync.line && <span className="truncate text-meta text-fg-muted">{sync.line}</span>}
    </div>
  );
}
