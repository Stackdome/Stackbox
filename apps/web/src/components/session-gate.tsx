import { type ReactNode, useEffect, useState } from "react";
import { EmptyState } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, refresh } = useCurrentUser();
  const [failed, setFailed] = useState(false);

  // A 401 is the api client's to answer: a lapsed session ends on Sign in.
  // Any other failure (the api unreachable) has nowhere else to go, so it
  // keeps its own state here instead of leaving a skeleton up forever.
  function tryRefresh() {
    refresh()
      .then(() => setFailed(false))
      .catch(() => setFailed(true));
  }

  useEffect(() => {
    tryRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  if (user) return <>{children}</>;
  if (failed) {
    return (
      <EmptyState
        className="h-screen w-full"
        title="Stackbox did not load"
        action={
          <Button variant="outline" onClick={tryRefresh}>
            Try again
          </Button>
        }
      />
    );
  }
  return <Skeleton data-slot="session-gate" className="h-screen w-full" />;
}
