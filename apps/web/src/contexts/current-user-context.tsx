import * as React from "react";
import type { components } from "@stackbox/contract";
import { UserRole } from "@stackbox/contract";
import { fetchCurrentUser } from "@/api/users";
import { getCurrentUser as getStoredUser } from "@/lib/common";
import { AUTH_SESSION_CHANGED } from "@/lib/auth-events";

type User = components["schemas"]["User"];

interface CurrentUserValue {
  user: User | null;
  isOrgAdmin: boolean;
  organisationId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const CurrentUserContext = React.createContext<CurrentUserValue | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setUser(await fetchCurrentUser());
    } finally {
      setLoading(false);
    }
  }, []);

  // The provider mounts once, on /sign-in before a token exists, and
  // client-side navigation after auth does not remount it. Re-reading the
  // stored user on this event is what keeps the gate from sticking on the
  // pre-auth (null) user.
  React.useEffect(() => {
    const onAuthChange = () => setUser(getStoredUser());
    window.addEventListener(AUTH_SESSION_CHANGED, onAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED, onAuthChange);
  }, []);

  const value = React.useMemo<CurrentUserValue>(
    () => ({
      user,
      isOrgAdmin: user?.role === UserRole.OrgAdmin,
      organisationId: user?.organisation_id ?? null,
      loading,
      refresh,
    }),
    [user, loading, refresh],
  );
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
