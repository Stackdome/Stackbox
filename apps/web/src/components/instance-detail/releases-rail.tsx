import { RELEASE_STATUS_LABEL, type ReleaseView } from "@/api/mappers/instance";
import { BlockedAction, RailNode, TimelineNode, TimelineRail, relativeAge } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { RELEASE_SHAPE, RELEASE_TONE } from "./release-marks";

export function ReleasesRail({
  releases,
  blockedReason,
  deploying,
  onDeploy,
}: {
  releases: ReleaseView[];
  blockedReason: string | null;
  deploying: boolean;
  onDeploy: () => void;
}) {
  return (
    <section aria-label="Releases" className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-name font-medium text-foreground">Releases</h2>
        <BlockedAction reason={blockedReason}>
          <Button variant="outline" size="sm" onClick={onDeploy} disabled={deploying}>
            Deploy
          </Button>
        </BlockedAction>
      </div>
      {releases.length === 0 ? (
        <p className="text-body text-fg-muted">No releases yet</p>
      ) : (
        <TimelineRail>
          {releases.map((release, index) => (
            <RailNode key={release.id} tone={RELEASE_TONE[release.status]} shape={RELEASE_SHAPE[release.status]} isLast={index === releases.length - 1}>
              <TimelineNode
                identity={release.ref ?? undefined}
                title={release.shaShort}
                time={relativeAge(release.createdAt)}
                state={{ word: RELEASE_STATUS_LABEL[release.status], tone: RELEASE_TONE[release.status] }}
                detail={release.runLabel ?? undefined}
              />
            </RailNode>
          ))}
        </TimelineRail>
      )}
    </section>
  );
}
