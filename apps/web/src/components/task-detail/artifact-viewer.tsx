import type { ArtifactView } from "@/api/mappers/task-detail";
import { SplitConsole } from "@/components/branded";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ArtifactViewer({ artifact, onClose }: { artifact: ArtifactView | null; onClose: () => void }) {
  return (
    <Dialog open={artifact !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="work" data-testid="artifact-viewer">
        <DialogHeader>
          <DialogTitle>{artifact?.label}</DialogTitle>
        </DialogHeader>
        {artifact?.isImage && <img src={artifact.url} alt={artifact.label} className="max-h-[70vh] w-full rounded-lg object-contain" />}
        {artifact?.logLines && (
          <SplitConsole sources={[]} lines={artifact.logLines.map((message, index) => ({ id: `${artifact.id}-${index}`, message }))} />
        )}
      </DialogContent>
    </Dialog>
  );
}
