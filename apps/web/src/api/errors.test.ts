import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import {
  cancelTaskErrorMessage,
  connectProviderErrorMessage,
  createApplicationErrorMessage,
  disconnectApplicationErrorMessage,
  releaseErrorMessage,
  spinUpErrorMessage,
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
  it("asks for the running tasks to finish on a 409 and keeps the retry message otherwise", () => {
    expect([disconnectApplicationErrorMessage(errorWithStatus(409)), disconnectApplicationErrorMessage(errorWithStatus(500))]).toEqual([
      "Cancel or finish this application's running tasks first",
      "The application was not disconnected. Try again.",
    ]);
  });
});

function errorWithBody(status: number, data: unknown): AxiosError {
  const error = errorWithStatus(status);
  error.response = { ...(error.response as NonNullable<AxiosError["response"]>), data };
  return error;
}

describe("releaseErrorMessage", () => {
  it("toasts the api's own sentence on a 409 and a retry otherwise", () => {
    expect([
      releaseErrorMessage(errorWithBody(409, { code: "release_in_flight", message: "Wait for the release in flight to finish first" })),
      releaseErrorMessage(errorWithStatus(500)),
    ]).toEqual(["Wait for the release in flight to finish first", "The release was not started. Try again."]);
  });
});

describe("spinUpErrorMessage", () => {
  it("names a Stackfile that never synced on a 409, an unknown ref on a 404 and a retry otherwise", () => {
    expect([spinUpErrorMessage(errorWithStatus(409)), spinUpErrorMessage(errorWithStatus(404)), spinUpErrorMessage(errorWithStatus(500))]).toEqual([
      "Sync the application's Stackfile before spinning up an instance",
      "The repository has no branch or tag with this name",
      "The instance was not spun up. Try again.",
    ]);
  });
});
