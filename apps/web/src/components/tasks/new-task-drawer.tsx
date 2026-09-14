import { useState } from "react";
import { Link } from "react-router-dom";
import type { Application } from "@/api/mappers/application";
import { type NewTaskDraft, emptyDraft } from "@/api/mappers/new-task";
import type { ArtifactView } from "@/api/mappers/task-detail";
import { Disclosure, EmptyState, FieldError, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerActions, DrawerBody, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";
import { ScreenshotDrop } from "./screenshot-drop";
import { problemsOf } from "./new-task-draft";

export interface NewTaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Application[];
  reporterName: string;
  onUpload: (file: File) => Promise<ArtifactView>;
  onSubmit: (draft: NewTaskDraft) => Promise<void>;
  lockedApplicationId?: string;
  initialDraft?: Partial<NewTaskDraft>;
  defaultAdvancedOpen?: boolean;
}

export function NewTaskDrawer({
  open,
  onOpenChange,
  applications,
  reporterName,
  onUpload,
  onSubmit,
  lockedApplicationId,
  initialDraft,
  defaultAdvancedOpen = false,
}: NewTaskDrawerProps) {
  const [draft, setDraft] = useState<NewTaskDraft>({ ...emptyDraft(lockedApplicationId), ...initialDraft });
  const [attempted, setAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const problems = attempted ? problemsOf(draft) : {};
  const update = (patch: Partial<NewTaskDraft>) => setDraft((current) => ({ ...current, ...patch }));

  async function attach(file: File) {
    if (!file.type.startsWith("image/")) {
      setScreenshotError("Drop an image file");
      return;
    }
    setScreenshotError(null);
    setUploading(true);
    try {
      update({ screenshot: await onUpload(file) });
    } catch {
      setScreenshotError("The screenshot did not upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setAttempted(true);
    if (Object.keys(problemsOf(draft)).length > 0) return;
    setSubmitting(true);
    setFailure(null);
    try {
      await onSubmit(draft);
    } catch {
      setFailure("The task was not created. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title="New task" description="Describe the bug; the agent reproduces it, fixes it and opens a pull request." />
        {applications.length === 0 ? (
          <>
            <DrawerBody>
              <EmptyState
                title="No application to run against"
                description="A task runs against an application. Connect one, then report the bug."
                action={
                  <Button asChild variant="outline">
                    <Link to={ROUTES.applications}>Connect an application first</Link>
                  </Button>
                }
              />
            </DrawerBody>
            <DrawerFooter>
              <DrawerActions>
                <DrawerClose asChild>
                  <Button variant="outline">Close</Button>
                </DrawerClose>
              </DrawerActions>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerBody>
              <FieldShell label="Application" htmlFor="new-task-application" required error={problems.application}>
                <Select value={draft.applicationId} onValueChange={(applicationId) => update({ applicationId })} disabled={lockedApplicationId !== undefined}>
                  <SelectTrigger id="new-task-application" className="w-full">
                    <SelectValue placeholder="shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((application) => (
                      <SelectItem key={application.id} value={application.id}>
                        {application.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Description" htmlFor="new-task-description" required error={problems.description}>
                <Textarea
                  id="new-task-description"
                  value={draft.description}
                  aria-invalid={problems.description !== undefined}
                  onChange={(event) => update({ description: event.target.value })}
                  placeholder="Tapping Checkout on Safari does nothing"
                />
              </FieldShell>
              <FieldShell label="Expected behaviour" htmlFor="new-task-expected">
                <Textarea
                  id="new-task-expected"
                  value={draft.expectedBehaviour}
                  onChange={(event) => update({ expectedBehaviour: event.target.value })}
                  placeholder="Checkout opens the payment step"
                />
              </FieldShell>
              <FieldShell label="Screenshot">
                <ScreenshotDrop
                  screenshot={draft.screenshot}
                  uploading={uploading}
                  error={screenshotError}
                  onFile={(file) => void attach(file)}
                  onRemove={() => update({ screenshot: null })}
                />
              </FieldShell>
              <FieldShell label="Reporter">
                <p className="text-body text-fg-2">{reporterName}</p>
              </FieldShell>
              <Disclosure label="Advanced" defaultOpen={defaultAdvancedOpen}>
                <FieldShell label="Target branch" htmlFor="new-task-branch" hint="Leave empty for the repository's default branch">
                  <Input id="new-task-branch" value={draft.targetBranch} onChange={(event) => update({ targetBranch: event.target.value })} placeholder="main" />
                </FieldShell>
                <FieldShell label="Run limit" htmlFor="new-task-run-limit">
                  <Input
                    id="new-task-run-limit"
                    type="number"
                    min={1}
                    max={5}
                    value={draft.runLimit}
                    onChange={(event) => update({ runLimit: Number(event.target.value) })}
                  />
                </FieldShell>
              </Disclosure>
            </DrawerBody>
            <DrawerFooter>
              {failure && <FieldError>{failure}</FieldError>}
              <DrawerActions>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
                <Button onClick={() => void submit()} disabled={submitting || uploading}>
                  Start task
                </Button>
              </DrawerActions>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
