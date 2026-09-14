import type { Application } from "@/api/mappers/application";
import type { RepositoryView } from "@/api/mappers/repository";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type BlockedRemove = { repository: RepositoryView; applications: Application[] };

export function RemoveBlockedDialog({ blocked, onClose }: { blocked: BlockedRemove | null; onClose: () => void }) {
  return (
    <Dialog
      open={blocked !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Remove is blocked</DialogTitle>
            <DialogDescription>{blocked && `${blocked.repository.fullName} backs these applications. Disconnect them first, then remove the repository.`}</DialogDescription>
          </DialogHeader>
          <ul aria-label="Applications using this repository" className="flex list-disc flex-col gap-1 pl-4 text-body">
            {blocked?.applications.map((application) => <li key={application.id}>{application.name}</li>)}
          </ul>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
