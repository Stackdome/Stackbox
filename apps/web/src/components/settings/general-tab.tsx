import { type FormEvent, useState } from "react";
import { SAVE_ORGANIZATION_ERROR } from "@/api/errors";
import { type GeneralDraft, type OrganizationView, generalDraftOf, generalDraftProblem, isGeneralDirty } from "@/api/mappers/organization";
import { useOrganization } from "@/api/use-settings";
import { EmptyState, FieldError, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, InputGroup } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

const NAME_ID = "organization-name";
const BUDGET_ID = "organization-budget";

export function GeneralForm({ organization, onSave }: { organization: OrganizationView; onSave: (draft: GeneralDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<GeneralDraft>(() => generalDraftOf(organization));
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const problem = generalDraftProblem(draft);
  const nameProblem = draft.name.trim() === "" ? problem : null;
  const budgetProblem = nameProblem === null ? problem : null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFailure(null);
    try {
      await onSave(draft);
    } catch {
      setFailure(SAVE_ORGANIZATION_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-[560px]">
      <form aria-label="General" noValidate className="flex flex-col gap-4 px-4" onSubmit={(event) => void save(event)}>
        <FieldShell label="Organization name" htmlFor={NAME_ID} required error={nameProblem}>
          <Input
            id={NAME_ID}
            placeholder="acme"
            aria-invalid={nameProblem !== null}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </FieldShell>
        <FieldShell label="Monthly budget" htmlFor={BUDGET_ID} required hint="Whole dollars. Tasks stop starting runs once the month's spend reaches it." error={budgetProblem}>
          <InputGroup
            id={BUDGET_ID}
            prefix="$"
            inputMode="numeric"
            placeholder="500"
            aria-invalid={budgetProblem !== null}
            value={draft.budget}
            onChange={(event) => setDraft({ ...draft, budget: event.target.value })}
          />
        </FieldShell>
        <div className="flex items-center justify-end gap-3">
          <FieldError className="mt-0">{failure}</FieldError>
          <Button type="submit" loading={saving} disabled={!isGeneralDirty(organization, draft) || problem !== null}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function GeneralTab() {
  const { organisationId, refresh: refreshUser } = useCurrentUser();
  const { organization, loading, refresh, save } = useOrganization(organisationId);

  if (loading) return <Skeleton className="h-48 max-w-[560px]" />;
  if (!organization) {
    return (
      <EmptyState
        title="The organization did not load"
        description="Check the connection and try again."
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            Try again
          </Button>
        }
      />
    );
  }
  return (
    <GeneralForm
      key={`${organization.name}:${organization.budgetDollars}`}
      organization={organization}
      onSave={async (draft) => {
        await save(draft);
        await refreshUser();
      }}
    />
  );
}
