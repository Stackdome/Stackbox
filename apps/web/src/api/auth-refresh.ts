import axios from "axios";
import { API_BASE_URL } from "./base-url";

// Bare axios, not the shared client, so a refused refresh never re-enters the refresh interceptor.
const REFRESH_URL = `${API_BASE_URL}/auth/refresh`;

// Single-flight: concurrent callers share one refresh request.
let refreshPromise: Promise<void> | null = null;

export function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(REFRESH_URL, undefined, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
