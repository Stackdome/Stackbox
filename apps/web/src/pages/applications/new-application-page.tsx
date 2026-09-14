import { useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { createApplicationErrorMessage } from "@/api/errors";
import { useApplications } from "@/api/use-applications";
import { useRepositories } from "@/api/use-repositories";
import { ConnectStep, connectFlowReducer, connectStages, initialConnectFlow, stackfilePathOf } from "@/components/applications/connect-flow-state";
import { DetectStep, RepositoryStep } from "@/components/applications/connect-steps";
import { StageTracker } from "@/components/branded";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useJourney } from "@/hooks/use-journey";
import { ROUTES, applicationPath } from "@/lib/routes";

export function NewApplicationPage() {
  useJourney(ROUTES.applications, "Connect application");
  const navigate = useNavigate();
  const { organisationId } = useCurrentUser();
  const { repositories, loading } = useRepositories(organisationId);
  const { detect, create } = useApplications(organisationId);
  const [state, dispatch] = useReducer(connectFlowReducer, initialConnectFlow);

  async function next() {
    const { repositoryId, repositoryFullName, stackfilePath } = state;
    dispatch({ type: "detect started" });
    try {
      const detection = await detect({ repositoryId, repositoryFullName, stackfilePath: stackfilePathOf(state) });
      dispatch({ type: "detect succeeded", detection, repositoryId, stackfilePath });
    } catch {
      dispatch({ type: "detect failed" });
    }
  }

  async function finish() {
    dispatch({ type: "finish started" });
    try {
      const id = await create({ name: state.name.trim(), slug: state.slug, repositoryId: state.repositoryId, stackfilePath: stackfilePathOf(state) });
      navigate(applicationPath(id));
    } catch (error) {
      dispatch({ type: "finish failed", message: createApplicationErrorMessage(error) });
    }
  }

  function step() {
    if (state.step === ConnectStep.Detect) {
      return <DetectStep state={state} dispatch={dispatch} onBack={() => dispatch({ type: "back" })} onFinish={() => void finish()} />;
    }
    if (loading) return <Skeleton className="h-40" />;
    return <RepositoryStep repositories={repositories} state={state} dispatch={dispatch} onNext={() => void next()} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 py-4">
      <StageTracker stages={connectStages(state)} />
      {step()}
    </div>
  );
}
