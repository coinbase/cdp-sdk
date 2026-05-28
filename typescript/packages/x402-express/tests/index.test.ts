import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@x402/express", () => ({
  paymentMiddlewareFromConfig: vi.fn().mockReturnValue(vi.fn()),
  paymentMiddleware: vi.fn().mockReturnValue(vi.fn()),
  paymentMiddlewareFromHTTPServer: vi.fn().mockReturnValue(vi.fn()),
  x402ResourceServer: vi.fn(),
  x402HTTPResourceServer: vi.fn(),
  setSettlementOverrides: vi.fn(),
  RouteConfigurationError: class RouteConfigurationError extends Error {},
  RouteValidationError: class RouteValidationError extends Error {},
  SETTLEMENT_OVERRIDES_HEADER: "x-settlement-overrides",
}));

vi.mock("@x402/evm/exact/server", () => ({
  ExactEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "exact" })),
}));

vi.mock("@x402/evm/upto/server", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({ scheme: "upto" })),
}));

vi.mock("@x402/svm/exact/server", () => ({
  ExactSvmScheme: vi.fn().mockImplementation(() => ({ scheme: "exact" })),
}));

vi.mock("@coinbase/x402", () => ({
  createCdpFacilitatorClient: vi.fn().mockReturnValue({ mockFacilitator: true }),
}));

vi.mock("@coinbase/x402/server", () => ({
  getCdpDefaultSchemes: vi
    .fn()
    .mockReturnValue([{ network: "eip155:8453", server: { scheme: "default-exact" } }]),
}));

import { createCdpFacilitatorClient } from "@coinbase/x402";
import { getCdpDefaultSchemes } from "@coinbase/x402/server";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { createCdpExpressMiddleware } from "../src/index.js";

describe("createCdpExpressMiddleware", () => {
  const ROUTES = {
    "GET /report": {
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
  });

  it("calls createCdpFacilitatorClient with provided credentials", () => {
    createCdpExpressMiddleware({
      routes: ROUTES,
      apiKeyId: "test-id",
      apiKeySecret: "test-secret",
    });
    expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
      apiKeyId: "test-id",
      apiKeySecret: "test-secret",
    });
  });

  it("calls paymentMiddlewareFromConfig with routes, facilitator, and default schemes", () => {
    createCdpExpressMiddleware({ routes: ROUTES });
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
    const customSchemes = [
      { network: "eip155:8453" as const, server: { scheme: "custom" as const } },
    ];
    createCdpExpressMiddleware({ routes: ROUTES, schemes: customSchemes });
    expect(getCdpDefaultSchemes).not.toHaveBeenCalled();
    expect(paymentMiddlewareFromConfig).toHaveBeenCalledWith(
      ROUTES,
      expect.anything(),
      customSchemes,
      undefined,
    );
  });

  it("passes paywallConfig through", () => {
    const paywallConfig = { theme: "dark" as const };
    createCdpExpressMiddleware({ routes: ROUTES, paywallConfig });
    expect(paymentMiddlewareFromConfig).toHaveBeenCalledWith(
      ROUTES,
      expect.anything(),
      expect.anything(),
      paywallConfig,
    );
  });

  it("returns the middleware function from paymentMiddlewareFromConfig", () => {
    const result = createCdpExpressMiddleware({ routes: ROUTES });
    expect(typeof result).toBe("function");
  });

  it("calls createCdpFacilitatorClient with no args when no credentials provided", () => {
    createCdpExpressMiddleware({ routes: ROUTES });
    expect(createCdpFacilitatorClient).toHaveBeenCalledWith({});
  });
});
