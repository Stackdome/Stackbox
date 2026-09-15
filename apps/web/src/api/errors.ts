// Parses the backend Error envelope into a structured shape the UI can consume:
// a top-level message plus per-field validation errors (details.errors[]) and
// the credential-required detail variant. Falls back to the flat reason string
// when no structured details are present.
import { getErrorMessage, getErrorStatus, isAxiosError, isBadRequestError, isErrorStatus, isForbiddenError } from "./client";

export type ParsedFieldError = {
  field: string;
  code: string;
  message: string;
};

export type CredentialErrorTarget = {
  kind: string;
  host: string;
  ref: string;
};

export type CredentialErrorInfo = {
  code: string;
  target: CredentialErrorTarget;
};

export type ParsedApiError = {
  status: number | undefined;
  // Numeric ServiceError code from the envelope, sent as a string ("30" = compute quota exceeded).
  code?: string;
  topLevel: string;
  fieldErrors: ParsedFieldError[];
  credential?: CredentialErrorInfo;
};

const CREDENTIAL_CODES = new Set(["credentials_required", "credentials_invalid"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

// The wire body is either an Error or an ErrorList; the structured details live
// on the primary Error (the list's first item when it's a list).
function primaryError(data: unknown): Record<string, unknown> | undefined {
  const record = asRecord(data);
  if (!record) return undefined;
  if (Array.isArray(record.items)) {
    return asRecord(record.items[0]);
  }
  return record;
}

function extractFieldErrors(details: Record<string, unknown> | undefined): ParsedFieldError[] {
  if (!details || !Array.isArray(details.errors)) return [];
  return details.errors.flatMap((entry): ParsedFieldError[] => {
    const fe = asRecord(entry);
    if (!fe || typeof fe.field !== "string" || typeof fe.message !== "string") return [];
    return [{ field: fe.field, code: typeof fe.code === "string" ? fe.code : "", message: fe.message }];
  });
}

function extractCredential(details: Record<string, unknown> | undefined): CredentialErrorInfo | undefined {
  if (!details || typeof details.code !== "string" || !CREDENTIAL_CODES.has(details.code)) return undefined;
  const target = asRecord(details.target);
  if (!target) return undefined;
  return {
    code: details.code,
    target: {
      kind: String(target.kind ?? ""),
      host: String(target.host ?? ""),
      ref: String(target.ref ?? ""),
    },
  };
}

// A 403 on cancel names the missing permission; every other failure keeps the generic toast.
export function cancelTaskErrorMessage(error: unknown): string {
  return isForbiddenError(error) ? "You do not have permission to cancel this task" : "The task was not cancelled";
}

export function connectProviderErrorMessage(error: unknown): string {
  if (isErrorStatus(error, 409)) return "This account is already connected";
  if (isBadRequestError(error)) return "The provider refused the connection. Check the login and try again.";
  return "The provider was not connected. Try again.";
}

export function createApplicationErrorMessage(error: unknown): string {
  return isErrorStatus(error, 409) ? "Another application already uses this slug" : "The application was not created. Try again.";
}

export function disconnectApplicationErrorMessage(error: unknown): string {
  if (!isErrorStatus(error, 409)) return "The application was not disconnected. Try again.";
  const body = isAxiosError(error) ? asRecord(error.response?.data) : undefined;
  return body?.code === "application_has_live_instances" ? "Tear down this application's instances first" : "Cancel or finish this application's running tasks first";
}

// A refused Deploy says why in the api's own words: a release in flight, or an instance that stopped running.
export function releaseErrorMessage(error: unknown): string {
  if (isForbiddenError(error)) return "You do not have permission to deploy this instance";
  const body = isAxiosError(error) ? asRecord(error.response?.data) : undefined;
  if (isErrorStatus(error, 409) && typeof body?.message === "string") return body.message;
  return "The release was not started. Try again.";
}

export const TEARDOWN_ERROR_MESSAGE = "The instance was not torn down. Try again.";

export const EXTEND_EXPIRY_ERROR_MESSAGE = "The expiry was not extended. Try again.";

export function teardownErrorMessage(error: unknown): string {
  return isForbiddenError(error) ? "You do not have permission to tear down this instance" : TEARDOWN_ERROR_MESSAGE;
}

export function extendExpiryErrorMessage(error: unknown): string {
  return isForbiddenError(error) ? "You do not have permission to extend this instance's expiry" : EXTEND_EXPIRY_ERROR_MESSAGE;
}

export function spinUpErrorMessage(error: unknown): string {
  if (isErrorStatus(error, 409)) return "Sync the application's Stackfile before spinning up an instance";
  if (isErrorStatus(error, 404)) {
    const body = isAxiosError(error) ? asRecord(error.response?.data) : undefined;
    return body?.code === "unknown_application" ? "This application no longer exists" : "The repository has no branch or tag with this name";
  }
  return "The instance was not spun up. Try again.";
}

export type OrganizationChoice = { id: string; name: string };

export function signInErrorMessage(error: unknown): string {
  if (isErrorStatus(error, 401)) return "The email or password is not right";
  if (isErrorStatus(error, 429)) return "Too many sign in attempts. Try again in a few minutes.";
  return "Signing in did not work. Try again.";
}

// A 409 on sign in means the email and password match accounts in several organizations.
export function organizationChoicesOf(error: unknown): OrganizationChoice[] | null {
  if (!isErrorStatus(error, 409) || !isAxiosError(error)) return null;
  const details = asRecord(asRecord(error.response?.data)?.details);
  return Array.isArray(details?.organizations) ? (details.organizations as OrganizationChoice[]) : null;
}

export function joinErrorMessage(error: unknown): string {
  if (isErrorStatus(error, 409)) return "This invite was already accepted, revoked or has expired";
  if (isErrorStatus(error, 404)) return "This invite link does not match any invite";
  if (isBadRequestError(error)) return "Enter your name and a password of at least 8 characters";
  return "Joining did not work. Try again.";
}

// Settings refusals (last admin, own account, member exists, invite pending) already say what to do in the api's words.
export const SETTINGS_PERMISSION = "You do not have permission to change this organization's settings";

export function settingsErrorMessage(error: unknown, fallback: string, badRequest?: string): string {
  if (isForbiddenError(error)) return SETTINGS_PERMISSION;
  const body = isAxiosError(error) ? asRecord(error.response?.data) : undefined;
  if (isErrorStatus(error, 409) && typeof body?.message === "string") return body.message;
  if (badRequest !== undefined && isBadRequestError(error)) return badRequest;
  return fallback;
}

export const SAVE_ORGANIZATION_ERROR = "The organization was not saved. Try again.";
export const INVITE_ERROR = "The invite was not sent. Try again.";
export const ROLE_CHANGE_ERROR = "The role was not changed. Try again.";
export const REMOVE_MEMBER_ERROR = "The member was not removed. Try again.";
export const REVOKE_INVITE_ERROR = "The invite was not revoked. Try again.";
export const CREATE_TOKEN_ERROR = "The token was not created. Try again.";
export const REVOKE_TOKEN_ERROR = "The token was not revoked. Try again.";

export function parseApiError(error: unknown): ParsedApiError {
  const primary = isAxiosError(error) ? primaryError(error.response?.data) : undefined;
  const details = asRecord(primary?.details);
  // Derive topLevel from the primary error's reason so ErrorList bodies (whose
  // reason lives on items[0]) resolve correctly; getErrorMessage matches any
  // object body as a single Error first and would miss it.
  const reason = typeof primary?.reason === "string" ? primary.reason : undefined;
  return {
    status: getErrorStatus(error),
    code: typeof primary?.code === "string" ? primary.code : undefined,
    topLevel: reason || getErrorMessage(error),
    fieldErrors: extractFieldErrors(details),
    credential: extractCredential(details),
  };
}
