import { InstanceStatus } from "@stackbox/contract";
import { type InstanceView, RELEASE_STATUS_LABEL, ownerText } from "@/api/mappers/instance";
import { CardFooterMeta, CardMetaGrid, EndpointPills, StatusText, relativeAge } from "@/components/branded";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExpiryText, PurposeChip } from "./instance-cells";

export function InstanceCards({ instances, now, onOpen }: { instances: InstanceView[]; now: number; onOpen: (instance: InstanceView) => void }) {
  return (
    <div data-slot="instance-cards" className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {instances.map((instance) => (
        <Card
          key={instance.id}
          role="link"
          tabIndex={0}
          aria-label={instance.title}
          data-muted={instance.status === InstanceStatus.TornDown ? "true" : undefined}
          onClick={() => onOpen(instance)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onOpen(instance);
          }}
          className={cn("cursor-pointer transition-colors hover:bg-[var(--wash-hover)] focus-ring-edge", instance.status === InstanceStatus.TornDown && "text-fg-muted")}
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-name font-medium">{instance.title}</span>
              <StatusText domain="instance" state={instance.status} icon />
            </div>
            <div className="flex items-center gap-2">
              <PurposeChip purpose={instance.purpose} />
              <ExpiryText expiresAt={instance.expiresAt} now={now} />
            </div>
            {instance.url && <EndpointPills urls={[{ resource: instance.identifier, url: instance.url }]} />}
            <CardMetaGrid
              rows={[
                { label: "OWNER", value: ownerText(instance.owner) },
                instance.latestRelease && { label: "RELEASE", value: instance.latestRelease.summary },
              ]}
            />
            <CardFooterMeta
              tone="neutral"
              word={instance.latestRelease ? RELEASE_STATUS_LABEL[instance.latestRelease.status] : "No release yet"}
              age={relativeAge(instance.createdAt)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
