import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@x402/hono", () => ({
  paymentMiddlewareFromConfig: vi.fn().mockReturnValue(vi.fn()),
  paymentMiddleware: vi.fn(),
  paymentMiddlewareFromHTTPServer: vi.fn(),
  x402ResourceServer: vi.fn(),
  x402HTTPResourceServer: vi.fn(),
  setSettlementOverrides: vi.fn(),
  RouteConfigurationError: class RouteConfigurationError extends Error {},
  SETTLEMENT_OVERRIDES_HEADER: "x-settlement-overrides",
}));

vi.mock("@coinbase/cdp-sdk/x402", () => ({
  createCdpFacilitatorClient: vi.fn().mockReturnValue({ mockFacilitator: true }),
  getCdpDefaultSchemes: vi
    .fn()
    .mockReturnValue([{ network: "eip155:8453", server: { scheme: "default-exact" } }]),
}));

import { createCdpFacilitatorClient, getCdpDefaultSchemes } from "@coinbase/cdp-sdk/x402";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { createCdpHonoMiddleware } from "../src/index.js";

describe("createCdpHonoMiddleware", () => {
  const ROUTES = {
    "/report": {
      accepts: {
        scheme: "exact" as const,
        price: "$0.01",
        network: "eip155:8453" as const,
        payTo: "0x123" as `0x${string}`,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paymentMiddlewareFromConfig).mockReturnValue(vi.fn());
  });

  it("creates facilitator with provided credentials", () => {
    createCdpHonoMiddleware({
      routes: ROUTES,
      apiKeyId: "test-id",
      apiKeySecret: "test-secret",
      network: "devnet",
    });

    expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
      apiKeyId: "test-id",
      apiKeySecret: "test-secret",
      network: "devnet",
    });
  });

  it("uses default CDP schemes when custom schemes are not provided", () => {
    createCdpHonoMiddleware({ routes: ROUTES });

    expect(getCdpDefaultSchemes).toHaveBeenCalled();
    const defaults = vi.mocked(getCdpDefaultSchemes).mock.results[0].value;
    expect(paymentMiddlewareFromConfig).toHaveBeenCalledWith(
      ROUTES,
      { mockFacilitator: true },
      defaults,
      undefined,
    );
  });

  it("uses custom schemes when provided", () => {
    const customSchemes = [{ network: "eip155:8453", server: { scheme: "custom" } }];

    createCdpHonoMiddleware({ routes: ROUTES, schemes: customSchemes as never });

    expect(getCdpDefaultSchemes).not.toHaveBeenCalled();
    expect(paymentMiddlewareFromConfig).toHaveBeenCalledWith(
      ROUTES,
      { mockFacilitator: true },
      customSchemes,
      undefined,
    );
  });
});
