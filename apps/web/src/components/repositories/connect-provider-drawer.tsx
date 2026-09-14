import { RepoProvider } from "@stackbox/contract";
import { useState } from "react";
import { connectProviderErrorMessage } from "@/api/errors";
import { PROVIDER_LABEL } from "@/api/mappers/repository";
import { FieldError, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerActions, DrawerBody, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROVIDER_FIELD_ID = "connect-provider";
const LOGIN_FIELD_ID = "connect-login";

export function ConnectProviderDrawer({
  open,
  onOpenChange,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (input: { provider: RepoProvider; accountLogin: string }) => Promise<void>;
}) {
  const [provider, setProvider] = useState<RepoProvider>(RepoProvider.Github);
  const [login, setLogin] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const loginError = attempted && login.trim() === "" ? "Enter the account or group login" : undefined;

  async function submit() {
    setAttempted(true);
    if (login.trim() === "") return;
    setBusy(true);
    setFailure(null);
    try {
      await onConnect({ provider, accountLogin: login.trim() });
      setLogin("");
      setAttempted(false);
      onOpenChange(false);
    } catch (error) {
      setFailure(connectProviderErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title="Connect provider" description="Stackbox lists the account's repositories once to check the connection." />
        <DrawerBody>
          <FieldShell label="Provider" htmlFor={PROVIDER_FIELD_ID} required>
            <Select value={provider} onValueChange={(value) => setProvider(value as RepoProvider)}>
              <SelectTrigger id={PROVIDER_FIELD_ID} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RepoProvider).map((value) => (
                  <SelectItem key={value} value={value}>
                    {PROVIDER_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>
          <FieldShell label="Account login" htmlFor={LOGIN_FIELD_ID} required error={loginError}>
            <Input
              id={LOGIN_FIELD_ID}
              value={login}
              aria-invalid={loginError !== undefined}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="acme"
            />
          </FieldShell>
        </DrawerBody>
        <DrawerFooter>
          {failure && <FieldError>{failure}</FieldError>}
          <DrawerActions>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button onClick={() => void submit()} disabled={busy}>
              Connect
            </Button>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
