import { type FormEvent, useReducer } from "react";
import { organizationChoicesOf, signInErrorMessage } from "@/api/errors";
import type { SignInDraft } from "@/api/mappers/current-user";
import { FieldError, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { initialSignInState, signInProblem, signInReducer } from "./sign-in-state";

const EMAIL_ID = "sign-in-email";
const PASSWORD_ID = "sign-in-password";

export function SignInForm({ onSubmit }: { onSubmit: (draft: SignInDraft) => Promise<void> }) {
  const [state, dispatch] = useReducer(signInReducer, undefined, initialSignInState);
  const failure = state.submit.status === "failed" ? state.submit.message : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = signInProblem(state);
    if (problem) {
      dispatch({ type: "submit failed", message: problem });
      return;
    }
    dispatch({ type: "submit started" });
    try {
      await onSubmit(state.draft);
    } catch (error) {
      const choices = organizationChoicesOf(error);
      dispatch(choices ? { type: "organization asked", choices } : { type: "submit failed", message: signInErrorMessage(error) });
    }
  }

  return (
    <form aria-label="Sign in" noValidate className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
      <FieldShell label="Email" htmlFor={EMAIL_ID} required>
        <Input
          id={EMAIL_ID}
          type="email"
          autoComplete="username"
          placeholder="ada@example.com"
          value={state.draft.email}
          onChange={(event) => dispatch({ type: "email changed", email: event.target.value })}
        />
      </FieldShell>
      <FieldShell label="Password" htmlFor={PASSWORD_ID} required>
        <PasswordInput
          id={PASSWORD_ID}
          autoComplete="current-password"
          value={state.draft.password}
          onChange={(event) => dispatch({ type: "password changed", password: event.target.value })}
        />
      </FieldShell>
      {state.choices.length > 0 && (
        <FieldShell label="Organization" required hint="This email has an account in more than one organization">
          <RadioGroup
            aria-label="Organization"
            value={state.draft.organizationId ?? ""}
            onValueChange={(organizationId) => dispatch({ type: "organization picked", organizationId })}
          >
            {state.choices.map((choice) => (
              <label key={choice.id} className="flex items-center gap-2 text-body text-foreground">
                <RadioGroupItem value={choice.id} />
                {choice.name}
              </label>
            ))}
          </RadioGroup>
        </FieldShell>
      )}
      <Button type="submit" size="lg" className="w-full" loading={state.submit.status === "submitting"}>
        Sign in
      </Button>
      <div role="alert" className="min-h-4">
        <FieldError className="mt-0">{failure}</FieldError>
      </div>
    </form>
  );
}
