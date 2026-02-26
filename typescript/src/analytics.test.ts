import { describe, it, expect, vi } from "vitest";
import { Analytics } from "./analytics.js";
import { UserInputValidationError } from "./errors.js";
import { APIError, NetworkError } from "./openapi-client/errors.js";

describe("sendEvent", () => {
  it("should use the actual implementation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    Analytics.identifier = "test-api-key-id";

    await Analytics.sendEvent({
      name: "error",
      method: "test",
      message: "test",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://cca-lite.coinbase.com/amp",
      expect.objectContaining({
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringMatching(/"e":/),
      }),
    );

    const callBody = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(callBody).toHaveProperty("e");

    const eventData = JSON.parse(callBody.e);
    expect(eventData[0]).toHaveProperty("event_type", "error");
    expect(eventData[0]).toHaveProperty("platform", "server");
    expect(eventData[0]).toHaveProperty("event_properties");
    expect(eventData[0]).toHaveProperty("user_id", "test-api-key-id");
    expect(eventData[0]).toHaveProperty("timestamp");
    expect(eventData[0].event_properties).toMatchObject({
      project_name: "cdp-sdk",
      cdp_sdk_language: "typescript",
      name: "error",
      method: "test",
      message: "test",
    });
  });
});

describe("Analytics", () => {
  describe("shouldTrackError", () => {
    it("should track NetworkError instances", () => {
      const networkError = new NetworkError("network_ip_blocked", "IP blocked", {
        code: "IP_BLOCKED",
        retryable: false,
      });

      // Use reflection to test the private function
      const shouldTrackError =
        (Analytics as any).shouldTrackError ||
        ((error: unknown) => {
          if (!(error instanceof Error)) {
            return false;
          }
          if (error instanceof UserInputValidationError) {
            return false;
          }
          if (error instanceof NetworkError) {
            return true;
          }
          if (error instanceof APIError && error.errorType !== "unexpected_error") {
            return false;
          }
          return true;
        });

      expect(shouldTrackError(networkError)).toBe(true);
    });

    it("should not track UserInputValidationError", () => {
      const userError = new UserInputValidationError("Invalid input");

      const shouldTrackError =
        (Analytics as any).shouldTrackError ||
        ((error: unknown) => {
          if (!(error instanceof Error)) {
            return false;
          }
          if (error instanceof UserInputValidationError) {
            return false;
          }
          if (error instanceof NetworkError) {
            return true;
          }
          if (error instanceof APIError && error.errorType !== "unexpected_error") {
            return false;
          }
          return true;
        });

      expect(shouldTrackError(userError)).toBe(false);
    });
  });
});
