import { useState } from "react";
import { type ApplicationDetailView, DEFAULT_STACKFILE_PATH } from "@/api/mappers/application";
import { DangerZone, DangerZoneRow, DetailList, DetailRow, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConfigTab({
  detail,
  onSaveStackfilePath,
  onDisconnect,
}: {
  detail: ApplicationDetailView;
  onSaveStackfilePath: (path: string) => Promise<void>;
  onDisconnect: () => void;
}) {
  const [path, setPath] = useState(detail.customStackfilePath ?? "");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const trimmed = path.trim();
  const changed = trimmed !== "" && trimmed !== (detail.customStackfilePath ?? "");

  async function save() {
    setSaving(true);
    setFailure(null);
    try {
      await onSaveStackfilePath(trimmed);
    } catch {
      setFailure("The Stackfile path was not saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <section aria-label="Stackfile settings" className="flex flex-col gap-3">
        <h2 className="text-name font-medium">Stackfile</h2>
        <DetailList>
          <DetailRow label="Repository">{detail.repository.fullName}</DetailRow>
        </DetailList>
        <FieldShell label="Stackfile path" htmlFor="config-stackfile-path" hint="A path inside the repository; the root default is stackfile.yaml" error={failure ?? undefined}>
          <div className="flex items-center gap-2">
            <Input
              id="config-stackfile-path"
              className="font-mono"
              value={path}
              placeholder={DEFAULT_STACKFILE_PATH}
              onChange={(event) => setPath(event.target.value)}
            />
            <Button variant="outline" onClick={() => void save()} disabled={!changed || saving}>
              Save
            </Button>
          </div>
        </FieldShell>
      </section>
      <section aria-label="Credentials" className="flex flex-col gap-3">
        <h2 className="text-name font-medium">Credentials</h2>
        {detail.credentials.length === 0 ? (
          <p className="text-body text-fg-muted">No credentials referenced</p>
        ) : (
          <DetailList>
            {detail.credentials.map((credential) => (
              <DetailRow key={credential.name} label={credential.name}>
                <span className="text-body text-fg-2">{credential.kindLabel}</span>
                <span className="min-w-0 truncate font-mono text-meta text-fg-muted">{credential.ref}</span>
              </DetailRow>
            ))}
          </DetailList>
        )}
      </section>
      <DangerZone>
        <DangerZoneRow
          title="Disconnect application"
          description="Deletes its services, tasks and their evidence. The repository stays connected."
          action={
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect application
            </Button>
          }
        />
      </DangerZone>
    </div>
  );
}
