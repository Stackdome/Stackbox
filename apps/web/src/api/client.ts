// Generic axios API client setup
import axios, { AxiosError } from 'axios';
import type { components } from '@stackbox/contract';
import { API_BASE_URL } from './base-url';
import { refreshSession } from './auth-refresh';
import { clearAuthSession } from '@/lib/common';
import { ROUTES, invitePath } from '@/lib/routes';

// OpenAPI Error types. The contract has no distinct ErrorList schema; the
// wire envelope for a list of errors is just an Error array under `items`.
export type ApiError = components["schemas"]["Error"];
export type ApiErrorList = { items?: ApiError[] };

// Combined error type that represents any API error
export type AppError = AxiosError<ApiError> | AxiosError<ApiErrorList> | Error;

export function isAxiosApiError(error: unknown): error is AxiosError<ApiError> {
  return error instanceof AxiosError && error.response?.data != null;
}

export function isAxiosApiErrorList(error: unknown): error is AxiosError<ApiErrorList> {
  return error instanceof AxiosError &&
    error.response?.data != null &&
    'items' in error.response.data;
}

export function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof AxiosError;
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosApiError(error)) {
    return error.response?.data?.reason ||
      error.message ||
      "An API error occurred";
  }

  if (isAxiosApiErrorList(error)) {
    const firstError = error.response?.data?.items?.[0];
    return firstError?.reason ||
      error.message ||
      "An API error occurred";
  }

  if (isAxiosError(error)) {
    return error.response?.statusText ||
      error.message ||
      "A network error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}

export function getErrorStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

export function isErrorStatus(error: unknown, status: number): boolean {
  return getErrorStatus(error) === status;
}

export function isNotFoundError(error: unknown): boolean {
  return isErrorStatus(error, 404);
}

export function isUnauthorizedError(error: unknown): boolean {
  return isErrorStatus(error, 401);
}

export function isForbiddenError(error: unknown): boolean {
  return isErrorStatus(error, 403);
}

export function isBadRequestError(error: unknown): boolean {
  return isErrorStatus(error, 400);
}

export function isServerError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status != null && status >= 500;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // The default JSON content type must not override the multipart boundary a FormData body needs.
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export interface AuthErrorDeps {
  refresh: () => Promise<void>;
  retry: (config: unknown) => Promise<unknown>;
  onAuthFailure: () => void;
  isAuthPage?: () => boolean;
}

// Sign in and Join answer their own 401s: a wrong password there is an answer, not a lapsed session.
export function isOnAuthPage(): boolean {
  const path = window.location.pathname;
  return path === ROUTES.login || path.startsWith(invitePath(''));
}

export async function handleResponseError(error: unknown, deps: AuthErrorDeps): Promise<unknown> {
  const err = error as { response?: { status?: number }; config?: { _retry?: boolean } };
  const onAuthPage = deps.isAuthPage ? deps.isAuthPage() : isOnAuthPage();
  const original = err?.config;

  if (err?.response?.status === 401 && !onAuthPage && original && !original._retry) {
    original._retry = true;
    try {
      await deps.refresh();
    } catch {
      // Only a failed refresh signs out; a failed retry must propagate as-is.
      deps.onAuthFailure();
      return Promise.reject(error);
    }
    return deps.retry(original);
  }
  return Promise.reject(error);
}

api.interceptors.response.use(
  (response) => response,
  (error) =>
    handleResponseError(error, {
      refresh: refreshSession,
      retry: (config) => api(config as Parameters<typeof api>[0]),
      onAuthFailure: () => {
        clearAuthSession();
        window.location.href = ROUTES.login;
      },
    }),
);

export default api;
