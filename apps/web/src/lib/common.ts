import type { components } from "@stackbox/contract";
import { AUTH_SESSION_CHANGED } from "@/lib/auth-events";

type CurrentUser = components["schemas"]["CurrentUser"];

const CURRENT_USER_KEY = "currentUser";

function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
}

// Only a CurrentUser carrying its organization is usable; anything else under the key reads as no one signed in.
export function getCurrentUser(): CurrentUser | null {
  try {
    const stored = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) ?? "null") as Partial<CurrentUser> | null;
    return stored?.organization ? (stored as CurrentUser) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(user: CurrentUser) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  notifyAuthSessionChanged();
}

export function clearAuthSession() {
  localStorage.removeItem(CURRENT_USER_KEY);
  notifyAuthSessionChanged();
}
