import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse, type NextRequest } from "next/server";

vi.mock("@x402/next", () => ({
  paymentProxyFromConfig: vi.fn().mockReturnValue(vi.fn()),
  paymentProxy: vi.fn().mockReturnValue(vi.fn()),
  paymentProxyFromHTTPServer: vi.fn().mockReturnValue(vi.fn()),
  withX402: vi.fn(),
  withX402FromHTTPServer: vi.fn().mockReturnValue(vi.fn()),
  x402ResourceServer: vi.fn().mockImplementation(() => ({
    register: vi.fn().mockReturnThis(),
  })),
  x402HTTPResourceServer: vi.fn(),
  RouteConfigurationError: class RouteConfigurationError extends Error {},
  RouteValidationError: class RouteValidationError extends Error {},
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
  getCdpDefaultSchemes: vi.fn().mockReturnValue([
    { network: "eip155:8453", server: { scheme: "default-exact" } },
    { network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", server: { scheme: "default-svm" } },
  ]),
}));

vi.mock("next/server", () => ({
  NextResponse: class NextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      });
    }
  },
  NextRequest: class NextRequest extends Request {},
}));

import { createCdpFacilitatorClient } from "@coinbase/x402";
import { getCdpDefaultSchemes } from "@coinbase/x402/server";
import { paymentProxyFromConfig, withX402, x402ResourceServer } from "@x402/next";
import { createCdpPaymentProxy } from "../src/index.js";
import { createCdpRouteHandler } from "../src/server.js";

describe("createCdpPaymentProxy", () => {
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
  });

  it("calls createCdpFacilitatorClient with provided credentials", () => {
    createCdpPaymentProxy({
      routes: ROUTES,
      apiKeyId: "test-id",
      apiKeySecret: "test-secret",
    });
    expect(createCdpFacilitatorClient).toHaveBeenCalledWith({
      apiKeyId: "test-id",
      apiKeySecret: "test-secret",
    });
  });

  it("calls paymentProxyFromConfig with routes, facilitator, and default schemes", () => {
    createCdpPaymentProxy({ routes: ROUTES });
    expect(getCdpDefaultSchemes).toHaveBeenCalled();
    const defaults = vi.mocked(getCdpDefaultSchemes).mock.results[0].value;
    expect(paymentProxyFromConfig).toHaveBeenCalledWith(
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
    createCdpPaymentProxy({ routes: ROUTES, schemes: customSchemes });
    expect(getCdpDefaultSchemes).not.toHaveBeenCalled();
    expect(paymentProxyFromConfig).toHaveBeenCalledWith(
      ROUTES,
      expect.anything(),
      customSchemes,
      undefined,
    );
  });
});

describe("createCdpRouteHandler", () => {
  const ROUTE_CONFIG = {
    accepts: {
      scheme: "exact" as const,
      price: "$0.01",
      network: "eip155:8453" as const,
      payTo: "0x123" as `0x${string}`,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(x402ResourceServer).mockImplementation(
      () =>
        ({
          register: vi.fn().mockReturnThis(),
        }) as unknown as InstanceType<typeof x402ResourceServer>,
    );
    // Default: pass through the inner handler so we can observe the wrapped behavior.
    vi.mocked(withX402).mockImplementation(((inner: (req: NextRequest) => Promise<unknown>) => {
      return (req: NextRequest) => inner(req);
    }) as never);
  });

  it("creates a configured x402ResourceServer and wraps with withX402", () => {
    const handler = vi.fn();
    createCdpRouteHandler(handler, { routeConfig: ROUTE_CONFIG });
    const expectedScheme = vi.mocked(getCdpDefaultSchemes).mock.results[0].value;
    const mockInstance = vi.mocked(x402ResourceServer).mock.results[0].value;
    expect(mockInstance.register).toHaveBeenCalledTimes(expectedScheme.length);
    expect(withX402).toHaveBeenCalledWith(
      expect.any(Function),
      ROUTE_CONFIG,
      mockInstance,
      undefined,
    );
  });

  it("forwards the App Router context argument to the inner handler", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = createCdpRouteHandler(handler, { routeConfig: ROUTE_CONFIG });
    const request = { nextUrl: { pathname: "/x" } } as unknown as NextRequest;
    const context = { params: Promise.resolve({ id: "42" }) };
    await wrapped(request, context);
    expect(handler).toHaveBeenCalledWith(request, context);
  });

  it("accepts a sync handler returning a plain Response", async () => {
    const handler = vi.fn().mockReturnValue(new Response("ok", { status: 200 }));
    const wrapped = createCdpRouteHandler(handler, { routeConfig: ROUTE_CONFIG });
    const request = { nextUrl: { pathname: "/x" } } as unknown as NextRequest;
    const result = (await wrapped(request, {} as never)) as NextResponse;
    expect(handler).toHaveBeenCalled();
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
  });
});
