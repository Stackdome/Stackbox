import * as React from "react";
import { type CurrentUserView, toCurrentUser } from "@/api/mappers/current-user";
import { fetchCurrentUser } from "@/api/users";
import { AUTH_SESSION_CHANGED } from "@/lib/auth-events";
import { getCurrentUser as getStoredUser, setAuthSession } from "@/lib/common";

interface CurrentUserValue {
  user: CurrentUserView | null;
  isOrgAdmin: boolean;
  organisationId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const CurrentUserContext = React.createContext<CurrentUserValue | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = React.useState(() => getStoredUser());
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setAuthSession(await fetchCurrentUser());
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign in and sign out land after the provider mounted, and client-side navigation does not remount it.
  React.useEffect(() => {
    const onAuthChange = () => setStored(getStoredUser());
    window.addEventListener(AUTH_SESSION_CHANGED, onAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED, onAuthChange);
  }, []);

  const value = React.useMemo<CurrentUserValue>(() => {
    const user = stored ? toCurrentUser(stored) : null;
    return { user, isOrgAdmin: user?.isOrgAdmin ?? false, organisationId: user?.organizationId ?? null, loading, refresh };
  }, [stored, loading, refresh]);
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
