import { type FormEvent, useState } from "react";
import { joinErrorMessage } from "@/api/errors";
import { type InvitePreviewView, type JoinDraft, MIN_PASSWORD_LENGTH, joinDraftProblem } from "@/api/mappers/organization";
import { FieldError, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const NAME_ID = "join-name";
const PASSWORD_ID = "join-password";

export function JoinForm({ preview, onSubmit }: { preview: InvitePreviewView; onSubmit: (draft: JoinDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<JoinDraft>({ name: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = joinDraftProblem(draft);
    if (problem) {
      setFailure(problem);
      return;
    }
    setFailure(null);
    setSubmitting(true);
    try {
      await onSubmit(draft);
    } catch (error) {
      setFailure(joinErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form aria-label={`Join ${preview.organizationName}`} noValidate className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
      <p className="text-body text-fg-2">{`Joining as ${preview.email}, ${preview.roleLabel}`}</p>
      <FieldShell label="Name" htmlFor={NAME_ID} required>
        <Input id={NAME_ID} autoComplete="name" placeholder="Grace Hopper" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </FieldShell>
      <FieldShell label="Password" htmlFor={PASSWORD_ID} required hint={`At least ${MIN_PASSWORD_LENGTH} characters`}>
        <PasswordInput id={PASSWORD_ID} autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
      </FieldShell>
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {`Join ${preview.organizationName}`}
      </Button>
      <div role="alert" className="min-h-4">
        <FieldError className="mt-0">{failure}</FieldError>
      </div>
    </form>
  );
}
