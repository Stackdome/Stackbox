import { ApiTokenExpiryDays } from "@stackbox/contract";
import { useState } from "react";
import { CREATE_TOKEN_ERROR, settingsErrorMessage } from "@/api/errors";
import {
  type ApiTokenCreatedView,
  TOKEN_EXPIRY_CHOICES,
  type TokenDraft,
  type TokenExpiryKey,
  tokenExpiryChoiceOf,
  tokenExpiryKeyOf,
  tokenExpiryLabel,
} from "@/api/mappers/api-token";
import { FieldError, FieldShell, FormSection } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerActions, DrawerBody, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyField } from "./copy-field";

const NAME_ID = "token-name";
const SECRET_ID = "token-secret";

const EXPIRY_OPTIONS: { value: TokenExpiryKey; label: string }[] = TOKEN_EXPIRY_CHOICES.map((choice) => ({ value: tokenExpiryKeyOf(choice), label: tokenExpiryLabel(choice) }));

export function NewTokenDrawer({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: TokenDraft) => Promise<ApiTokenCreatedView>;
}) {
  const [draft, setDraft] = useState<TokenDraft>({ name: "", expiry: ApiTokenExpiryDays.Quarter });
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [created, setCreated] = useState<ApiTokenCreatedView | null>(null);

  async function submit() {
    setSubmitting(true);
    setFailure(null);
    try {
      setCreated(await onSubmit(draft));
    } catch (error) {
      setFailure(settingsErrorMessage(error, CREATE_TOKEN_ERROR));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title="New API token" description="A token acts as you, with your role, from a script or a pipeline." />
        {created ? (
          <>
            <DrawerBody>
              <p className="text-body text-fg-2">Copy the token now. It is not shown again.</p>
              <CopyField id={SECRET_ID} label="Token" value={created.secret} />
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
              <FormSection label="Token">
                <FieldShell label="Name" htmlFor={NAME_ID} required hint="Say where the token is used, so you know what breaks when you revoke it">
                  <Input id={NAME_ID} placeholder="deploy bot" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </FieldShell>
                <FieldShell label="Expires">
                  <SegmentedControl
                    aria-label="Expires"
                    fill
                    options={EXPIRY_OPTIONS}
                    value={tokenExpiryKeyOf(draft.expiry)}
                    onValueChange={(key) => setDraft({ ...draft, expiry: tokenExpiryChoiceOf(key) })}
                  />
                </FieldShell>
              </FormSection>
            </DrawerBody>
            <DrawerFooter>
              <FieldError>{failure}</FieldError>
              <DrawerActions>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
                <Button onClick={() => void submit()} loading={submitting} disabled={draft.name.trim() === ""}>
                  Create
                </Button>
              </DrawerActions>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
