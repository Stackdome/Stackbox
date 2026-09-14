import { InstanceStatus } from "@stackbox/contract";
import type { InstanceView } from "@/api/mappers/instance";
import { DataListCell, DataListHeader, DataListName, DataListRow, StatusText, absoluteAge, relativeAge } from "@/components/branded";
import { cn } from "@/lib/utils";
import { ExpiryText, InstanceUrlLink, LatestReleaseCell, OwnerCell, PurposeChip } from "./instance-cells";

export const INSTANCE_COLUMNS = "grid-cols-[minmax(240px,1.4fr)_96px_128px_minmax(160px,1fr)_minmax(180px,1fr)_120px_88px]";

const LABELS = ["Instance", "Purpose", "Status", "Owner", "Latest release", "Expires", "Created"];

export function InstanceList({ instances, now, onOpen }: { instances: InstanceView[]; now: number; onOpen: (instance: InstanceView) => void }) {
  return (
    <div data-slot="instance-list">
      <DataListHeader columns={INSTANCE_COLUMNS} labels={LABELS} />
      {instances.map((instance) => {
        const tornDown = instance.status === InstanceStatus.TornDown;
        return (
          <DataListRow
            key={instance.id}
            columns={INSTANCE_COLUMNS}
            label={instance.title}
            onActivate={() => onOpen(instance)}
            data-muted={tornDown ? "true" : undefined}
            className={cn(tornDown && "text-fg-muted")}
          >
            <DataListName name={instance.title} secondary={instance.url ? <InstanceUrlLink url={instance.url} /> : "No URL yet"} mono={false} />
            <PurposeChip purpose={instance.purpose} />
            <StatusText domain="instance" state={instance.status} icon />
            <OwnerCell owner={instance.owner} />
            <LatestReleaseCell release={instance.latestRelease} />
            <ExpiryText expiresAt={instance.expiresAt} now={now} />
            <DataListCell title={absoluteAge(instance.createdAt) ?? undefined}>{relativeAge(instance.createdAt)}</DataListCell>
          </DataListRow>
        );
      })}
    </div>
  );
}
