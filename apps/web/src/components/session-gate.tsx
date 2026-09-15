import { type ReactNode, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, refresh } = useCurrentUser();

  // A failed read is the api client's to answer: a lapsed session ends on Sign in.
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return user ? <>{children}</> : <Skeleton data-slot="session-gate" className="h-screen w-full" />;
}
