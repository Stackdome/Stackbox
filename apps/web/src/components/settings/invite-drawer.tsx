import { UserRole } from "@stackbox/contract";
import { useState } from "react";
import { INVITE_ERROR, settingsErrorMessage } from "@/api/errors";
import { type InviteCreatedView, type InviteDraft, ROLES, ROLE_LABEL } from "@/api/mappers/organization";
import { FieldError, FieldShell, FormSection } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerActions, DrawerBody, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyField } from "./copy-field";

const EMAIL_ID = "invite-email";
const LINK_ID = "invite-link";

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }));

export function InviteDrawer({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: InviteDraft) => Promise<InviteCreatedView>;
}) {
  const [draft, setDraft] = useState<InviteDraft>({ email: "", role: UserRole.OrgMember });
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [created, setCreated] = useState<InviteCreatedView | null>(null);

  async function submit() {
    setSubmitting(true);
    setFailure(null);
    try {
      setCreated(await onSubmit(draft));
    } catch (error) {
      setFailure(settingsErrorMessage(error, INVITE_ERROR));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title="Invite a member" description="They join with the role you pick. Send them the link yourself." />
        {created ? (
          <>
            <DrawerBody>
              <p className="text-body text-fg-2">{`Send this link to ${created.email}. It works once and expires in 7 days.`}</p>
              <CopyField id={LINK_ID} label="Invite link" value={created.link} />
            </DrawerBody>
            <DrawerFooter>
              <DrawerActions>
                <DrawerClose asChild>
                  <Button>Done</Button>
                </DrawerClose>
              </DrawerActions>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerBody>
              <FormSection label="Member">
                <FieldShell label="Email" htmlFor={EMAIL_ID} required>
                  <Input id={EMAIL_ID} type="email" placeholder="grace@example.com" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                </FieldShell>
                <FieldShell label="Role">
                  <SegmentedControl aria-label="Role" fill options={ROLE_OPTIONS} value={draft.role} onValueChange={(role) => setDraft({ ...draft, role })} />
                </FieldShell>
              </FormSection>
            </DrawerBody>
            <DrawerFooter>
              <FieldError>{failure}</FieldError>
              <DrawerActions>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
                <Button onClick={() => void submit()} loading={submitting} disabled={draft.email.trim() === ""}>
                  Invite
                </Button>
              </DrawerActions>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
