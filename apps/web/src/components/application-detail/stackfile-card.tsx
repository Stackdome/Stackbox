import { Loader2 } from "lucide-react";
import type { ApplicationDetailView } from "@/api/mappers/application";
import { DetailList, DetailRow, absoluteAge, relativeAge } from "@/components/branded";
import { Button } from "@/components/ui/button";

export function StackfileCard({ detail, syncing, onSync }: { detail: ApplicationDetailView; syncing: boolean; onSync: () => Promise<void> }) {
  return (
    <section aria-label="Stackfile" className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm outline-1 outline-border-subtle">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-name font-medium">Stackfile</h2>
        <Button variant="outline" size="sm" onClick={() => void onSync()} disabled={syncing}>
          {syncing && <Loader2 aria-hidden className="motion-safe:animate-spin" />}
          Re-sync
        </Button>
      </div>
      <p className="text-body text-fg-2">{detail.sync.label}</p>
      <DetailList>
        <DetailRow label="Repository">{detail.repository.fullName}</DetailRow>
        <DetailRow label="Path">{detail.stackfilePath}</DetailRow>
        <DetailRow label="Synced at">{detail.syncedShaShort}</DetailRow>
        <DetailRow label="Validated" title={absoluteAge(detail.validatedAt) ?? undefined}>
          {relativeAge(detail.validatedAt)}
        </DetailRow>
      </DetailList>
    </section>
  );
}
