import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCdpBazaarClient } from "../../../src/core/bazaar/index.js";
import { CDP_FACILITATOR_URL } from "../../../src/core/facilitator/constants.js";
import { SDK_METADATA } from "../../../src/core/constants.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const listResponse = {
  x402Version: 2,
  items: [{ resource: "https://api.example.com", type: "http", x402Version: 2, accepts: [] }],
  pagination: { limit: 20, offset: 0, total: 1 },
};

const searchResponse = {
  x402Version: 2,
  resources: [{ resource: "https://api.example.com", type: "http", x402Version: 2, accepts: [] }],
  partialResults: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(listResponse),
    text: () => Promise.resolve(""),
    statusText: "OK",
  });
});

describe("createCdpBazaarClient", () => {
  it("requires no credentials — returns a client without any arguments", () => {
    expect(() => createCdpBazaarClient()).not.toThrow();
  });

  it("returns an object with listResources, searchResources, and getMerchantResources", () => {
    const client = createCdpBazaarClient();
    expect(typeof client.listResources).toBe("function");
    expect(typeof client.searchResources).toBe("function");
    expect(typeof client.getMerchantResources).toBe("function");
  });

  it("allows a baseUrl override", () => {
    expect(() => createCdpBazaarClient({ baseUrl: "https://custom.example.com" })).not.toThrow();
  });

  describe("listResources", () => {
    it("sends GET to the discovery/resources endpoint", async () => {
      const client = createCdpBazaarClient();
      await client.listResources();

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`${CDP_FACILITATOR_URL}/discovery/resources`);
      expect(options.method).toBe("GET");
    });

    it("includes the Correlation-Context header", async () => {
      const client = createCdpBazaarClient();
      await client.listResources();

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers["Correlation-Context"]).toContain("source=cdp-x402");
      expect(headers["Correlation-Context"]).toContain(
        `sourceVersion=${SDK_METADATA.sourceVersion}`,
      );
    });

    it("appends type param to the URL", async () => {
      const client = createCdpBazaarClient();
      await client.listResources({ type: "http" });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("type=http");
    });

    it("appends limit and offset params", async () => {
      const client = createCdpBazaarClient();
      await client.listResources({ limit: 5, offset: 10 });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("limit=5");
      expect(url).toContain("offset=10");
    });

    it("omits optional params when not provided", async () => {
      const client = createCdpBazaarClient();
      await client.listResources();

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).not.toContain("type=");
      expect(url).not.toContain("limit=");
      expect(url).not.toContain("offset=");
    });

    it("returns parsed response", async () => {
      const client = createCdpBazaarClient();
      const result = await client.listResources();
      expect(result).toEqual(listResponse);
    });

    it("uses a custom baseUrl when provided", async () => {
      const client = createCdpBazaarClient({ baseUrl: "https://custom.example.com" });
      await client.listResources();

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("https://custom.example.com/discovery/resources");
    });

    it("normalizes trailing slash in custom baseUrl", async () => {
      const client = createCdpBazaarClient({ baseUrl: "https://custom.example.com/" });
      await client.listResources();

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toBe("https://custom.example.com/discovery/resources");
    });

    it("throws a descriptive error on non-OK response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve("service unavailable"),
        statusText: "Service Unavailable",
      });

      const client = createCdpBazaarClient();
      await expect(client.listResources()).rejects.toThrow(/CDP Bazaar request failed \(503\)/);
    });
  });

  describe("searchResources", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(searchResponse),
        text: () => Promise.resolve(""),
        statusText: "OK",
      });
    });

    it("sends GET to the discovery/search endpoint with the query param", async () => {
      const client = createCdpBazaarClient();
      await client.searchResources({ query: "weather APIs" });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`${CDP_FACILITATOR_URL}/discovery/search`);
      expect(url).toContain("query=weather+APIs");
      expect(options.method).toBe("GET");
    });

    it("includes the Correlation-Context header", async () => {
      const client = createCdpBazaarClient();
      await client.searchResources({ query: "test" });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers["Correlation-Context"]).toContain("source=cdp-x402");
    });

    it("appends optional filter params including asset, maxUsdPrice, and urlSubstring", async () => {
      const client = createCdpBazaarClient();
      await client.searchResources({
        query: "test",
        network: "eip155:8453",
        scheme: "exact",
        payTo: "0xabc",
        asset: "0xtoken",
        maxUsdPrice: "1.50",
        urlSubstring: "api.example.com",
        limit: 10,
      });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("network=eip155%3A8453");
      expect(url).toContain("scheme=exact");
      expect(url).toContain("payTo=0xabc");
      expect(url).toContain("asset=0xtoken");
      expect(url).toContain("maxUsdPrice=1.50");
      expect(url).toContain("urlSubstring=api.example.com");
      expect(url).toContain("limit=10");
      expect(url).not.toContain("cursor=");
    });

    it("appends multiple extensions values", async () => {
      const client = createCdpBazaarClient();
      await client.searchResources({
        query: "test",
        extensions: ["bazaar", "payment-identifier"],
      });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("extensions=bazaar");
      expect(url).toContain("extensions=payment-identifier");
    });

    it("returns parsed response", async () => {
      const client = createCdpBazaarClient();
      const result = await client.searchResources({ query: "example" });
      expect(result).toEqual(searchResponse);
    });

    it("throws a descriptive error on non-OK response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("bad request"),
        statusText: "Bad Request",
      });

      const client = createCdpBazaarClient();
      await expect(client.searchResources({ query: "test" })).rejects.toThrow(
        /CDP Bazaar request failed \(400\)/,
      );
    });

    it("preserves searchMethod values not declared by the SDK enum (e.g. 'hybrid')", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...searchResponse,
            searchMethod: "hybrid",
          }),
        text: () => Promise.resolve(""),
        statusText: "OK",
      });

      const client = createCdpBazaarClient();
      const result = await client.searchResources({ query: "test" });
      expect(result.searchMethod).toBe("hybrid");
    });

    it("preserves known searchMethod values", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...searchResponse,
            searchMethod: "vector",
          }),
        text: () => Promise.resolve(""),
        statusText: "OK",
      });

      const client = createCdpBazaarClient();
      const result = await client.searchResources({ query: "test" });
      expect(result.searchMethod).toBe("vector");
    });

    it("omits searchMethod when not present in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(searchResponse),
        text: () => Promise.resolve(""),
        statusText: "OK",
      });

      const client = createCdpBazaarClient();
      const result = await client.searchResources({ query: "test" });
      expect(result.searchMethod).toBeUndefined();
    });
  });

  describe("getMerchantResources", () => {
    const merchantResponse = {
      x402Version: 2,
      payTo: "0xmerchant",
      resources: [
        { resource: "https://api.example.com/data", type: "http", x402Version: 2, accepts: [] },
      ],
      pagination: { limit: 25, offset: 0, total: 1 },
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(merchantResponse),
        text: () => Promise.resolve(""),
        statusText: "OK",
      });
    });

    it("sends GET to the discovery/merchant endpoint with payTo param", async () => {
      const client = createCdpBazaarClient();
      await client.getMerchantResources({ payTo: "0xmerchant" });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`${CDP_FACILITATOR_URL}/discovery/merchant`);
      expect(url).toContain("payTo=0xmerchant");
      expect(options.method).toBe("GET");
    });

    it("includes the Correlation-Context header", async () => {
      const client = createCdpBazaarClient();
      await client.getMerchantResources({ payTo: "0xmerchant" });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers["Correlation-Context"]).toContain("source=cdp-x402");
    });

    it("appends limit and offset params", async () => {
      const client = createCdpBazaarClient();
      await client.getMerchantResources({ payTo: "0xmerchant", limit: 10, offset: 5 });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=5");
    });

    it("returns parsed response", async () => {
      const client = createCdpBazaarClient();
      const result = await client.getMerchantResources({ payTo: "0xmerchant" });
      expect(result).toEqual(merchantResponse);
    });

    it("throws a descriptive error on non-OK response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("missing payTo"),
        statusText: "Bad Request",
      });

      const client = createCdpBazaarClient();
      await expect(client.getMerchantResources({ payTo: "0xmerchant" })).rejects.toThrow(
        /CDP Bazaar request failed \(400\)/,
      );
    });

    it("returns an empty merchant response when the API returns 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("not found"),
        statusText: "Not Found",
      });

      const client = createCdpBazaarClient();
      const result = await client.getMerchantResources({
        payTo: "0xmerchant",
        limit: 25,
        offset: 0,
      });

      expect(result).toEqual({
        x402Version: 2,
        payTo: "0xmerchant",
        resources: [],
        pagination: { limit: 25, offset: 0 },
      });
    });

    it("returns an empty pagination object on 404 when limit/offset are omitted", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("not found"),
        statusText: "Not Found",
      });

      const client = createCdpBazaarClient();
      const result = await client.getMerchantResources({ payTo: "0xmerchant" });

      expect(result).toEqual({
        x402Version: 2,
        payTo: "0xmerchant",
        resources: [],
        pagination: {},
      });
    });
  });
});
