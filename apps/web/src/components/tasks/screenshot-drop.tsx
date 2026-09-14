import type { ArtifactView } from "@/api/mappers/task-detail";
import { FieldError } from "@/components/branded";
import { Button } from "@/components/ui/button";

export function ScreenshotDrop({
  screenshot,
  uploading,
  error,
  onFile,
  onRemove,
}: {
  screenshot: ArtifactView | null;
  uploading: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  if (screenshot) {
    return (
      <div className="flex items-center gap-3">
        <img src={screenshot.url} alt="Screenshot preview" className="h-16 w-24 rounded-md object-cover shadow-sm" />
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-meta text-fg-muted hover:bg-[var(--wash-hover)]"
      >
        <input
          type="file"
          accept="image/*"
          aria-label="Screenshot"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        {uploading ? "Uploading" : "Drop a screenshot here, or click to choose one"}
      </label>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
