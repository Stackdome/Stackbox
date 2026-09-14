import type { Dispatch } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_STACKFILE_PATH, SLUG_PATTERN } from "@/api/mappers/application";
import type { RepositoryView } from "@/api/mappers/repository";
import { AlertBanner, FieldError, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROUTES } from "@/lib/routes";
import { type ConnectFlowAction, type ConnectFlowState, canFinish, canGoNext } from "./connect-flow-state";
import { ServiceKindGlyph } from "./service-kind-glyph";

export function RepositoryStep({
  repositories,
  state,
  dispatch,
  onNext,
}: {
  repositories: RepositoryView[];
  state: ConnectFlowState;
  dispatch: Dispatch<ConnectFlowAction>;
  onNext: () => void;
}) {
  function choose(repositoryId: string) {
    const repository = repositories.find((candidate) => candidate.id === repositoryId);
    if (repository) {
      dispatch({ type: "repository chosen", repositoryId, fullName: repository.fullName, shortName: repository.shortName });
    }
  }

  return (
    <section aria-label="Repository" className="flex flex-col gap-5">
      <FieldShell
        label="Repository"
        htmlFor="connect-repository"
        required
        hint={
          <Link to={ROUTES.repositories} className="underline">
            Add repositories
          </Link>
        }
      >
        <Select value={state.repositoryId} onValueChange={choose}>
          <SelectTrigger id="connect-repository" className="w-full">
            <SelectValue placeholder="acme/shop" />
          </SelectTrigger>
          <SelectContent>
            {repositories.map((repository) => (
              <SelectItem key={repository.id} value={repository.id}>
                {repository.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>
      <FieldShell label="Stackfile path" htmlFor="connect-stackfile" hint="Leave empty for stackfile.yaml at the repository root">
        <Input
          id="connect-stackfile"
          className="font-mono"
          value={state.stackfilePath}
          placeholder={DEFAULT_STACKFILE_PATH}
          onChange={(event) => dispatch({ type: "path changed", stackfilePath: event.target.value })}
        />
      </FieldShell>
      <div className="flex flex-col items-start gap-1">
        <Button variant="outline" disabled>
          Let the agent generate one
        </Button>
        <p className="text-meta text-fg-muted">Onboarding tasks arrive later</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canGoNext(state)}>
          Next
        </Button>
      </div>
    </section>
  );
}

export function DetectStep({
  state,
  dispatch,
  onBack,
  onFinish,
}: {
  state: ConnectFlowState;
  dispatch: Dispatch<ConnectFlowAction>;
  onBack: () => void;
  onFinish: () => void;
}) {
  const detection = state.detect.status === "done" ? state.detect.detection : null;
  const path = state.stackfilePath.trim() || DEFAULT_STACKFILE_PATH;
  const slugError = detection && !SLUG_PATTERN.test(state.slug) ? "Use lowercase letters, digits and hyphens" : undefined;

  return (
    <section aria-label="Detect services" className="flex flex-col gap-5">
      {state.detect.status === "detecting" && (
        <p role="status" className="text-body text-fg-2">
          Reading {path} in {state.repositoryFullName}
        </p>
      )}
      {state.detect.status === "failed" && (
        <AlertBanner title="Detection did not run">The repository could not be read. Go back and try again.</AlertBanner>
      )}
      {detection?.error && <AlertBanner title={`Stackfile at ${path}`}>{detection.error}</AlertBanner>}
      {detection && detection.error === null && (
        <div className="flex flex-col gap-2">
          <h2 className="text-name font-medium">Detected services</h2>
          <ul aria-label="Detected services" className="flex flex-col">
            {detection.services.map((service) => (
              <li key={service.name} className="flex h-10 items-center gap-3 px-2">
                <ServiceKindGlyph kind={service.kind} />
                <span className="text-body font-medium">{service.name}</span>
                <span className="truncate font-mono text-meta text-fg-muted">{service.source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {detection && (
        <>
          <FieldShell label="Name" htmlFor="connect-name" required>
            <Input id="connect-name" value={state.name} onChange={(event) => dispatch({ type: "name changed", name: event.target.value })} />
          </FieldShell>
          <FieldShell label="Slug" htmlFor="connect-slug" required error={slugError}>
            <Input
              id="connect-slug"
              className="font-mono"
              value={state.slug}
              aria-invalid={slugError !== undefined}
              onChange={(event) => dispatch({ type: "slug changed", slug: event.target.value })}
            />
          </FieldShell>
        </>
      )}
      {state.failure && <FieldError>{state.failure}</FieldError>}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={state.finishing}>
          Back
        </Button>
        <Button onClick={onFinish} disabled={!canFinish(state)}>
          Finish
        </Button>
      </div>
    </section>
  );
}
