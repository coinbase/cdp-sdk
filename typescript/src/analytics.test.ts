import { describe, it, expect, vi } from "vitest";
import { Analytics } from "./analytics.js";

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
