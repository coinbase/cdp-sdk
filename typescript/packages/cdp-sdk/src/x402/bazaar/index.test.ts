import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListX402DiscoveryResources, mockSearchX402Resources, mockListX402DiscoveryMerchant } =
  vi.hoisted(() => ({
    mockListX402DiscoveryResources: vi.fn(),
    mockSearchX402Resources: vi.fn(),
    mockListX402DiscoveryMerchant: vi.fn(),
  }));

vi.mock("../../openapi-client/index.js", () => ({
  listX402DiscoveryResources: mockListX402DiscoveryResources,
  searchX402Resources: mockSearchX402Resources,
  listX402DiscoveryMerchant: mockListX402DiscoveryMerchant,
}));

import { createCdpBazaarClient } from "./index.js";

describe("createCdpBazaarClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when a custom baseUrl is provided", () => {
    expect(() => createCdpBazaarClient({ baseUrl: "https://example.com" })).toThrow(
      "Custom Bazaar baseUrl overrides are no longer supported.",
    );
  });

  it("delegates search to the generated OpenAPI client", async () => {
    const expected = {
      x402Version: 2,
      resources: [],
      partialResults: false,
      searchMethod: "hybrid",
    };
    mockSearchX402Resources.mockResolvedValue(expected);

    const bazaar = createCdpBazaarClient();
    const result = await bazaar.searchResources({ query: "weather" });

    expect(mockSearchX402Resources).toHaveBeenCalledWith({ query: "weather" });
    expect(result).toEqual(expected);
  });
});
