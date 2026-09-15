import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "@/api/auth";
import { clearAuthSession } from "@/lib/common";
import { ROUTES } from "@/lib/routes";

export function useSignOut(): () => Promise<void> {
  const navigate = useNavigate();
  return useCallback(async () => {
    // The session ends here whether or not the api heard the sign out.
    await signOut().catch(() => undefined);
    clearAuthSession();
    navigate(ROUTES.login, { replace: true });
  }, [navigate]);
}
