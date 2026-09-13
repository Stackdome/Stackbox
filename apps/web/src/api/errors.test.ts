import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { cancelTaskErrorMessage } from "./errors";

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
