/**
 * Integration tests for createCdpBazaarClient against the real CDP Bazaar.
 *
 * These tests hit the live CDP Bazaar API and require valid CDP credentials
 * (CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET). They are skipped
 * automatically when credentials are not present in the environment.
 *
 * Note: Unlike the cdp-x402 standalone package which called Bazaar directly,
 * cdp-sdk routes all Bazaar calls through the CDP API client, which requires
 * authentication even for discovery endpoints.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createCdpBazaarClient } from "./index.js";
import { configure } from "../../openapi-client/cdpApiClient.js";

const hasCredentials = Boolean(
  process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET,
);

beforeAll(() => {
  if (!hasCredentials) return;
  configure({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    walletSecret: process.env.CDP_WALLET_SECRET!,
  });
});

const describeWithCreds = hasCredentials ? describe : describe.skip;

const client = createCdpBazaarClient();

describeWithCreds("createCdpBazaarClient (integration)", () => {
  describe("listResources", () => {
    it("returns a response with the expected shape", async () => {
      const result = await client.listResources({ limit: 5 });

      expect(result).toBeDefined();
      expect(typeof result.x402Version).toBe("number");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(typeof result.pagination.limit).toBe("number");
      expect(typeof result.pagination.offset).toBe("number");
      expect(typeof result.pagination.total).toBe("number");
    });

    it("each item has the expected resource fields", async () => {
      const result = await client.listResources({ limit: 5 });

      for (const item of result.items) {
        expect(typeof item.resource).toBe("string");
        expect(item.resource.length).toBeGreaterThan(0);
        expect(typeof item.type).toBe("string");
        expect(typeof item.x402Version).toBe("number");
        expect(Array.isArray(item.accepts)).toBe(true);
      }
    });

    it("filters by type=http without error", async () => {
      const result = await client.listResources({ type: "http", limit: 5 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("respects limit parameter", async () => {
      const result = await client.listResources({ limit: 2 });
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("pagination offset works", async () => {
      const page1 = await client.listResources({ limit: 2, offset: 0 });
      const page2 = await client.listResources({ limit: 2, offset: 2 });
      expect(Array.isArray(page1.items)).toBe(true);
      expect(Array.isArray(page2.items)).toBe(true);
    });
  });

  describe("searchResources", () => {
    it("returns a response with the expected shape", async () => {
      const result = await client.searchResources({ query: "weather", limit: 5 });

      expect(result).toBeDefined();
      expect(typeof result.x402Version).toBe("number");
      expect(Array.isArray(result.resources)).toBe(true);
      expect(typeof result.partialResults).toBe("boolean");
    });

    it("each result item has the expected resource fields", async () => {
      const result = await client.searchResources({ query: "API", limit: 5 });

      for (const item of result.resources) {
        expect(typeof item.resource).toBe("string");
        expect(item.resource.length).toBeGreaterThan(0);
        expect(typeof item.type).toBe("string");
      }
    });

    it("filters by network without error", async () => {
      const result = await client.searchResources({
        query: "payment",
        network: "eip155:8453",
        limit: 5,
      });
      expect(Array.isArray(result.resources)).toBe(true);
    });
  });
});
