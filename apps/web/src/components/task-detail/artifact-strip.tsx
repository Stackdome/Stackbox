import { FileText } from "lucide-react";
import type { ArtifactView } from "@/api/mappers/task-detail";

export function ArtifactStrip({ artifacts, onOpen }: { artifacts: ArtifactView[]; onOpen: (artifact: ArtifactView) => void }) {
  if (artifacts.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {artifacts.map((artifact) => (
        <button
          key={artifact.id}
          type="button"
          aria-label={`Open ${artifact.label.toLowerCase()}`}
          onClick={() => onOpen(artifact)}
          className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-md bg-card shadow-sm focus-ring-edge"
        >
          {artifact.isImage ? (
            <img src={artifact.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex items-center gap-1 text-meta text-fg-2">
              <FileText aria-hidden="true" className="size-4" />
              {artifact.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
