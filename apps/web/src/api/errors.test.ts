import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import {
  REMOVE_MEMBER_ERROR,
  cancelTaskErrorMessage,
  connectProviderErrorMessage,
  createApplicationErrorMessage,
  disconnectApplicationErrorMessage,
  extendExpiryErrorMessage,
  joinErrorMessage,
  organizationChoicesOf,
  releaseErrorMessage,
  SETTINGS_PERMISSION,
  settingsErrorMessage,
  signInErrorMessage,
  spinUpErrorMessage,
  teardownErrorMessage,
} from "./errors";

function errorWithStatus(status: number): AxiosError {
  const error = new AxiosError("request failed");
  error.response = { status, statusText: "", headers: {}, config: {} as never, data: {} };
  return error;
}

describe("cancelTaskErrorMessage", () => {
  it("names the missing permission on a 403", () => {
    expect(cancelTaskErrorMessage(errorWithStatus(403))).toBe("You do not have permission to cancel this task");
  });

  it("keeps the generic toast for every other failure", () => {
    expect(cancelTaskErrorMessage(errorWithStatus(409))).toBe("The task was not cancelled");
  });
});

describe("connectProviderErrorMessage", () => {
  it("says the account is already connected on a 409, the provider refused on a 400, and retry otherwise", () => {
    expect([connectProviderErrorMessage(errorWithStatus(409)), connectProviderErrorMessage(errorWithStatus(400)), connectProviderErrorMessage(errorWithStatus(500))]).toEqual([
      "This account is already connected",
      "The provider refused the connection. Check the login and try again.",
      "The provider was not connected. Try again.",
    ]);
  });
});

describe("createApplicationErrorMessage", () => {
  it("names the taken slug on a 409 and keeps the retry message otherwise", () => {
    expect([createApplicationErrorMessage(errorWithStatus(409)), createApplicationErrorMessage(errorWithStatus(500))]).toEqual([
      "Another application already uses this slug",
      "The application was not created. Try again.",
    ]);
  });
});

describe("disconnectApplicationErrorMessage", () => {
  it("asks for the running tasks to finish on a plain 409, names the live instances by code, and keeps the retry message otherwise", () => {
    expect([
      disconnectApplicationErrorMessage(errorWithStatus(409)),
      disconnectApplicationErrorMessage(errorWithBody(409, { code: "application_has_live_instances", message: "Tear down this application's instances first" })),
      disconnectApplicationErrorMessage(errorWithStatus(500)),
    ]).toEqual(["Cancel or finish this application's running tasks first", "Tear down this application's instances first", "The application was not disconnected. Try again."]);
  });
});

function errorWithBody(status: number, data: unknown): AxiosError {
  const error = errorWithStatus(status);
  error.response = { ...(error.response as NonNullable<AxiosError["response"]>), data };
  return error;
}

describe("releaseErrorMessage", () => {
  it("names the missing permission on a 403, toasts the api's own sentence on a 409 and a retry otherwise", () => {
    expect([
      releaseErrorMessage(errorWithStatus(403)),
      releaseErrorMessage(errorWithBody(409, { code: "release_in_flight", message: "Wait for the release in flight to finish first" })),
      releaseErrorMessage(errorWithStatus(500)),
    ]).toEqual(["You do not have permission to deploy this instance", "Wait for the release in flight to finish first", "The release was not started. Try again."]);
  });
});

describe("teardownErrorMessage", () => {
  it("names the missing permission on a 403 and keeps the generic toast otherwise", () => {
    expect([teardownErrorMessage(errorWithStatus(403)), teardownErrorMessage(errorWithStatus(500))]).toEqual([
      "You do not have permission to tear down this instance",
      "The instance was not torn down. Try again.",
    ]);
  });
});

describe("extendExpiryErrorMessage", () => {
  it("names the missing permission on a 403 and keeps the generic toast otherwise", () => {
    expect([extendExpiryErrorMessage(errorWithStatus(403)), extendExpiryErrorMessage(errorWithStatus(500))]).toEqual([
      "You do not have permission to extend this instance's expiry",
      "The expiry was not extended. Try again.",
    ]);
  });
});

describe("spinUpErrorMessage", () => {
  it("names a Stackfile that never synced on a 409, the missing ref or application on a 404 by code, and a retry otherwise", () => {
    expect([
      spinUpErrorMessage(errorWithStatus(409)),
      spinUpErrorMessage(errorWithBody(404, { code: "unknown_ref" })),
      spinUpErrorMessage(errorWithBody(404, { code: "unknown_application" })),
      spinUpErrorMessage(errorWithStatus(500)),
    ]).toEqual([
      "Sync the application's Stackfile before spinning up an instance",
      "The repository has no branch or tag with this name",
      "This application no longer exists",
      "The instance was not spun up. Try again.",
    ]);
  });
});

describe("signInErrorMessage", () => {
  it("says the email or password is not right on a 401, to wait on a 429 and to try again otherwise", () => {
    expect([signInErrorMessage(errorWithStatus(401)), signInErrorMessage(errorWithStatus(429)), signInErrorMessage(errorWithStatus(500))]).toEqual([
      "The email or password is not right",
      "Too many sign in attempts. Try again in a few minutes.",
      "Signing in did not work. Try again.",
    ]);
  });
});

describe("organizationChoicesOf", () => {
  it("reads the organizations to choose from a 409 and nothing from any other refusal", () => {
    const organizations = [
      { id: "org-1", name: "acme" },
      { id: "org-2", name: "globex" },
    ];

    expect([
      organizationChoicesOf(errorWithBody(409, { code: "choose_organization", message: "Choose the organization to sign in to", details: { organizations } })),
      organizationChoicesOf(errorWithStatus(401)),
    ]).toEqual([organizations, null]);
  });
});

describe("joinErrorMessage", () => {
  it("names an invite that is no longer pending, a link that matches nothing and a form the api refused", () => {
    expect([joinErrorMessage(errorWithStatus(409)), joinErrorMessage(errorWithStatus(404)), joinErrorMessage(errorWithStatus(400)), joinErrorMessage(errorWithStatus(500))]).toEqual([
      "This invite was already accepted, revoked or has expired",
      "This invite link does not match any invite",
      "Enter your name and a password of at least 8 characters",
      "Joining did not work. Try again.",
    ]);
  });
});

describe("settingsErrorMessage", () => {
  it("says a 409 in the api's own words and falls back to the message it is given", () => {
    expect([
      settingsErrorMessage(errorWithBody(409, { code: "last_admin", message: "Make another member an admin first" }), REMOVE_MEMBER_ERROR),
      settingsErrorMessage(errorWithStatus(500), REMOVE_MEMBER_ERROR),
    ]).toEqual(["Make another member an admin first", "The member was not removed. Try again."]);
  });

  it("names the missing permission on a 403 regardless of the fallback", () => {
    expect(settingsErrorMessage(errorWithStatus(403), REMOVE_MEMBER_ERROR)).toBe(SETTINGS_PERMISSION);
  });
});
