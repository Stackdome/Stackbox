import { InstanceStatus } from "@stackbox/contract";
import { type InstanceDetailView, deployBlockedReason, expiredAgo } from "@/api/mappers/instance";
import { AlertBanner } from "@/components/branded";
import { cn } from "@/lib/utils";
import { InstanceFacts } from "./instance-facts";
import { ReleasesRail } from "./releases-rail";

export function InstanceDetail({
  detail,
  now,
  deploying,
  onDeploy,
}: {
  detail: InstanceDetailView;
  now: number;
  deploying: boolean;
  onDeploy?: () => void;
}) {
  const tornDown = detail.status === InstanceStatus.TornDown;
  return (
    <div data-slot="instance-detail" data-muted={tornDown ? "true" : undefined} className={cn("flex flex-col gap-6", tornDown && "text-fg-muted")}>
      {detail.status === InstanceStatus.Degraded && <AlertBanner>The latest release failed</AlertBanner>}
      {detail.status === InstanceStatus.Expired && detail.expiresAt !== null && (
        <AlertBanner tone="blocking">{`This instance expired ${expiredAgo(detail.expiresAt, now)}`}</AlertBanner>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-8">
        <ReleasesRail releases={detail.releases} blockedReason={deployBlockedReason(detail)} deploying={deploying} onDeploy={onDeploy} />
        <InstanceFacts detail={detail} now={now} />
      </div>
    </div>
  );
}
