import { detailColumnsClass } from "./layout";
import { useState } from "react";
import type { ArtifactView } from "@/api/mappers/task-detail";
import type { TaskDetailData } from "@/api/use-task-detail";
import { StageTracker, relativeAge } from "@/components/branded";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtifactViewer } from "./artifact-viewer";
import { ChecksTab } from "./checks-tab";
import { ConversationTab } from "./conversation-tab";
import { NeedsYouBanner } from "./needs-you-banner";
import { stagesFor } from "./phase-stages";
import { RunsTab } from "./runs-tab";
import { TaskRail } from "./task-rail";
import { TimelineTab } from "./timeline-tab";

export function TaskDetail({ data, onReply }: { data: TaskDetailData; onReply: (body: string) => Promise<void> }) {
  const { detail } = data;
  const [viewing, setViewing] = useState<ArtifactView | null>(null);
  const facts = [
    detail.application.name,
    detail.runLabel,
    `Created ${relativeAge(detail.createdAt)}`,
    detail.completedAt && `Finished ${relativeAge(detail.completedAt)}`,
  ].filter(Boolean);

  return (
    <div data-slot="task-detail" className={detailColumnsClass}>
      <div className="flex min-w-0 flex-col gap-6">
        <p className="text-meta text-fg-muted">{facts.join(" · ")}</p>
        {detail.blockingQuestion && <NeedsYouBanner question={detail.blockingQuestion} onSend={onReply} />}
        <StageTracker stages={stagesFor(detail)} />
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="pt-4">
            <TimelineTab entries={data.timeline} />
          </TabsContent>
          <TabsContent value="checks" className="pt-4">
            <ChecksTab checks={data.checks} pendingCheck={detail.pendingCheck} onOpenArtifact={setViewing} />
          </TabsContent>
          <TabsContent value="runs" className="pt-4">
            <RunsTab runs={data.runs} />
          </TabsContent>
          <TabsContent value="conversation" className="pt-4">
            <ConversationTab messages={data.messages} />
          </TabsContent>
        </Tabs>
      </div>
      <TaskRail detail={detail} checks={data.checks} onOpenArtifact={setViewing} />
      <ArtifactViewer artifact={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
