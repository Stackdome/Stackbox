import { useReducer } from "react";
import { Link } from "react-router-dom";
import type { Application } from "@/api/mappers/application";
import type { NewTaskDraft } from "@/api/mappers/new-task";
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
import { drawerReducer, initialDrawerState } from "./new-task-drawer-state";

const APPLICATION_TRIGGER_ID = "new-task-application";
const DESCRIPTION_FIELD_ID = "new-task-description";
const CLOSE_BUTTON_ID = "new-task-close";

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
  const [state, dispatch] = useReducer(drawerReducer, undefined, () => initialDrawerState(lockedApplicationId, initialDraft));
  const { draft } = state;
  const uploading = state.upload.status === "uploading";
  const screenshotError = state.upload.status === "failed" ? state.upload.message : null;
  const submitting = state.submit.status === "submitting";
  const failure = state.submit.status === "failed" ? state.submit.message : null;
  const problems = state.submit.status === "idle" ? {} : problemsOf(draft);
  const update = (patch: Partial<NewTaskDraft>) => dispatch({ type: "field changed", patch });

  async function attach(file: File) {
    if (!file.type.startsWith("image/")) {
      dispatch({ type: "upload failed", message: "Drop an image file" });
      return;
    }
    dispatch({ type: "screenshot dropped" });
    try {
      const artifact = await onUpload(file);
      dispatch({ type: "upload succeeded", artifact });
    } catch {
      dispatch({ type: "upload failed", message: "The screenshot did not upload. Try again." });
    }
  }

  async function submit() {
    dispatch({ type: "submit attempted" });
    if (Object.keys(problemsOf(draft)).length > 0) return;
    dispatch({ type: "submit started" });
    try {
      await onSubmit(draft);
      dispatch({ type: "submit succeeded" });
    } catch {
      dispatch({ type: "submit failed", message: "The task was not created. Try again." });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        size="form"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const targetId =
            applications.length === 0 ? CLOSE_BUTTON_ID : lockedApplicationId !== undefined ? DESCRIPTION_FIELD_ID : APPLICATION_TRIGGER_ID;
          (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`#${targetId}`)?.focus();
        }}
      >
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
                  <Button id={CLOSE_BUTTON_ID} variant="outline">Close</Button>
                </DrawerClose>
              </DrawerActions>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerBody>
              <FieldShell label="Application" htmlFor={APPLICATION_TRIGGER_ID} required error={problems.application}>
                <Select value={draft.applicationId} onValueChange={(applicationId) => update({ applicationId })} disabled={lockedApplicationId !== undefined}>
                  <SelectTrigger id={APPLICATION_TRIGGER_ID} className="w-full">
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
              <FieldShell label="Description" htmlFor={DESCRIPTION_FIELD_ID} required error={problems.description}>
                <Textarea
                  id={DESCRIPTION_FIELD_ID}
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
                  onRemove={() => dispatch({ type: "screenshot removed" })}
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
