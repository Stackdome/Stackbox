import { InstancePurpose } from "@stackbox/contract";
import { useReducer } from "react";
import { Link } from "react-router-dom";
import { spinUpErrorMessage } from "@/api/errors";
import { EXPIRY_PRESETS, EXPIRY_PRESET_LABEL, PURPOSE_LABEL, SPIN_UP_PURPOSES, type SpinUpDraft } from "@/api/mappers/instance";
import { BlockedAction, EmptyState, FieldError, FieldShell, FormSection } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerActions, DrawerBody, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROUTES } from "@/lib/routes";
import {
  type ExpiryKey,
  NO_EXPIRY,
  type SpinUpApplication,
  type SpinUpInitial,
  canSubmit,
  expiryChoiceOf,
  expiryKeyOf,
  initialSpinUpState,
  spinUpReducer,
} from "./spin-up-state";

const APPLICATION_TRIGGER_ID = "spin-up-application";
const REF_FIELD_ID = "spin-up-ref";

export const LOAD_TEST_HINT = "Load test instances get the same resources as any other instance.";

const PURPOSE_OPTIONS = SPIN_UP_PURPOSES.map((purpose) => ({ value: purpose, label: PURPOSE_LABEL[purpose] }));

const EXPIRY_OPTIONS: { value: ExpiryKey; label: string }[] = [
  ...EXPIRY_PRESETS.map((hours) => ({ value: expiryKeyOf(hours), label: EXPIRY_PRESET_LABEL[hours] })),
  { value: NO_EXPIRY, label: "No expiry" },
];

export interface SpinUpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: SpinUpApplication[];
  initial?: SpinUpInitial;
  onSubmit: (draft: SpinUpDraft) => Promise<void>;
}

export function SpinUpDrawer({ open, onOpenChange, applications, initial, onSubmit }: SpinUpDrawerProps) {
  const [state, dispatch] = useReducer(spinUpReducer, initial, initialSpinUpState);
  const { draft } = state;
  const failure = state.submit.status === "failed" ? state.submit.message : null;

  async function submit() {
    dispatch({ type: "submit started" });
    try {
      await onSubmit(draft);
    } catch (error) {
      dispatch({ type: "submit failed", message: spinUpErrorMessage(error) });
    }
  }

  function pickApplication(applicationId: string) {
    const application = applications.find((candidate) => candidate.id === applicationId);
    if (application) dispatch({ type: "application picked", application });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title="Spin up application instance" description="A running copy of one application, for as long as you need it." />
        {applications.length === 0 ? (
          <>
            <DrawerBody>
              <EmptyState
                title="No application to spin up"
                description="An Application Instance runs one application. Connect one, then spin it up."
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
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
                <BlockedAction reason="Connect an application first">
                  <Button>Spin up</Button>
                </BlockedAction>
              </DrawerActions>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerBody>
              <FormSection label="Application">
                <FieldShell label="Application" htmlFor={APPLICATION_TRIGGER_ID} required>
                  <Select value={draft.applicationId} onValueChange={pickApplication} disabled={state.lockedApplicationId !== null}>
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
                <FieldShell label="Ref" htmlFor={REF_FIELD_ID} required hint="A branch or tag of the application's repository">
                  <Input id={REF_FIELD_ID} value={draft.ref} onChange={(event) => dispatch({ type: "ref changed", ref: event.target.value })} placeholder="main" />
                </FieldShell>
              </FormSection>
              <FormSection label="Lifetime">
                <FieldShell label="Purpose">
                  <SegmentedControl
                    aria-label="Purpose"
                    fill
                    options={PURPOSE_OPTIONS}
                    value={draft.purpose}
                    onValueChange={(purpose) => dispatch({ type: "purpose picked", purpose })}
                  />
                </FieldShell>
                {draft.purpose === InstancePurpose.LoadTest && <p className="text-meta text-fg-muted">{LOAD_TEST_HINT}</p>}
                <FieldShell label="Expiry">
                  <SegmentedControl
                    aria-label="Expiry"
                    fill
                    disabled={draft.purpose === InstancePurpose.Persistent}
                    options={EXPIRY_OPTIONS}
                    value={expiryKeyOf(draft.expiry)}
                    onValueChange={(key) => dispatch({ type: "expiry picked", expiry: expiryChoiceOf(key) })}
                  />
                </FieldShell>
              </FormSection>
            </DrawerBody>
            <DrawerFooter>
              {failure && <FieldError>{failure}</FieldError>}
              <DrawerActions>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
                <Button onClick={() => void submit()} disabled={!canSubmit(state)}>
                  Spin up
                </Button>
              </DrawerActions>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
