/**
 * CDP Bazaar client for discovering and searching x402-gated resources.
 *
 * Delegates to the generated OpenAPI functions from the cdp-sdk openapi-client.
 * The CDP Bazaar endpoints are unauthenticated — no CDP API key credentials needed.
 */

import {
  listX402DiscoveryResources,
  searchX402Resources,
  listX402DiscoveryMerchant,
} from "../../openapi-client/index.js";
import { SDK_METADATA } from "../constants.js";

import type {
  X402DiscoveryMerchantResponse,
  X402DiscoveryResource,
  X402DiscoveryResourceType,
  X402DiscoveryResourcesResponse,
  X402ResourceQuality,
  X402SearchResourcesResponse as SdkX402SearchResourcesResponse,
  X402SearchResourcesResponseSearchMethod as SdkX402SearchResourcesResponseSearchMethod,
  ListX402DiscoveryMerchantParams,
  ListX402DiscoveryResourcesParams,
  SearchX402ResourcesParams,
} from "../../openapi-client/index.js";

/**
 * The CDP Bazaar API can return `"hybrid"` as a searchMethod, which is not
 * yet declared in the generated enum. We widen the type here so consumers
 * performing exhaustive checks see the full set of runtime values.
 */
export type X402SearchResourcesResponseSearchMethod =
  | SdkX402SearchResourcesResponseSearchMethod
  | "hybrid"
  | (string & {});

/**
 * Search-response type overriding the SDK's strict `searchMethod` enum with
 * a widened type that includes runtime values not yet present in the SDK.
 */
export type X402SearchResourcesResponse = Omit<SdkX402SearchResourcesResponse, "searchMethod"> & {
  searchMethod?: X402SearchResourcesResponseSearchMethod;
};

export type {
  X402ResourceQuality,
  X402DiscoveryResource,
  X402DiscoveryResourceType,
  X402DiscoveryResourcesResponse,
  X402DiscoveryMerchantResponse,
  ListX402DiscoveryResourcesParams,
  ListX402DiscoveryMerchantParams,
  SearchX402ResourcesParams,
};

/** Options for creating a CDP Bazaar client. */
export interface CdpBazaarClientArgs {
  /**
   * Override the CDP Bazaar base URL.
   * When set, falls back to raw fetch (for custom deployments).
   * Defaults to the production CDP API endpoint via the generated client.
   */
  baseUrl?: string;
}

/** CDP Bazaar client interface for discovering and searching x402 resources. */
export interface CdpBazaarClient {
  /**
   * List x402 discovery resources from the CDP Bazaar.
   */
  listResources(params?: ListX402DiscoveryResourcesParams): Promise<X402DiscoveryResourcesResponse>;

  /**
   * Search x402 resources in the CDP Bazaar using a natural-language query.
   */
  searchResources(params?: SearchX402ResourcesParams): Promise<X402SearchResourcesResponse>;

  /**
   * Fetch all resources registered by a specific merchant address.
   */
  getMerchantResources(
    params: ListX402DiscoveryMerchantParams,
  ): Promise<X402DiscoveryMerchantResponse>;
}

/**
 * Normalize a raw search response — widen the searchMethod to include
 * values not yet in the generated enum (e.g. `"hybrid"`).
 *
 * @param raw
 */
function normalizeSearchResponse(raw: unknown): X402SearchResourcesResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    ...(data as object),
    ...(typeof data.searchMethod === "string"
      ? { searchMethod: data.searchMethod as X402SearchResourcesResponseSearchMethod }
      : {}),
  } as X402SearchResourcesResponse;
}

/**
 * Creates a CDP Bazaar client backed by the generated OpenAPI functions.
 *
 * No CDP API key credentials are required — the Bazaar endpoints are public.
 * When `args.baseUrl` is set, the client falls back to raw fetch (for custom deployments).
 *
 * @param args
 * @example
 * ```typescript
 * const bazaar = createCdpBazaarClient();
 * const resources = await bazaar.listResources({ type: "http", limit: 20 });
 * const results = await bazaar.searchResources({ query: "weather APIs" });
 * ```
 */
export function createCdpBazaarClient(args?: CdpBazaarClientArgs): CdpBazaarClient {
  if (args?.baseUrl) {
    return createRawFetchBazaarClient(args.baseUrl);
  }

  return {
    async listResources(params) {
      return listX402DiscoveryResources(params);
    },

    async searchResources(params) {
      const raw = await searchX402Resources(params);
      return normalizeSearchResponse(raw);
    },

    async getMerchantResources(params) {
      try {
        return await listX402DiscoveryMerchant(params);
      } catch (error) {
        const isNotFound =
          error instanceof Error &&
          "statusCode" in error &&
          (error as { statusCode?: number }).statusCode === 404;
        if (isNotFound) {
          const pagination: { limit?: number; offset?: number } = {};
          if (params.limit !== undefined) pagination.limit = params.limit;
          if (params.offset !== undefined) pagination.offset = params.offset;

          return {
            x402Version: 2,
            payTo: params.payTo,
            resources: [],
            pagination,
          } as X402DiscoveryMerchantResponse;
        }
        throw error;
      }
    },
  };
}

/**
 * Fallback bazaar client for custom base URL deployments.
 * Uses raw fetch instead of the generated OpenAPI client.
 *
 * @param baseUrlInput
 */
function createRawFetchBazaarClient(baseUrlInput: string): CdpBazaarClient {
  const baseUrl = baseUrlInput.replace(/\/+$/, "");
  const correlationContext = Object.entries(SDK_METADATA)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  /**
   *
   * @param url
   */
  async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Correlation-Context": correlationContext },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      const err = new Error(`CDP Bazaar request failed (${response.status}): ${body}`) as Error & {
        statusCode: number;
      };
      err.statusCode = response.status;
      throw err;
    }
    return response.json() as Promise<T>;
  }

  return {
    async listResources(params) {
      const url = new URL(`${baseUrl}/discovery/resources`);
      if (params?.type !== undefined) url.searchParams.set("type", params.type);
      if (params?.limit !== undefined) url.searchParams.set("limit", String(params.limit));
      if (params?.offset !== undefined) url.searchParams.set("offset", String(params.offset));
      return fetchJson<X402DiscoveryResourcesResponse>(url.toString());
    },

    async searchResources(params) {
      const url = new URL(`${baseUrl}/discovery/search`);
      if (params?.query !== undefined) url.searchParams.set("query", params.query);
      if (params?.network !== undefined) url.searchParams.set("network", params.network);
      if (params?.asset !== undefined) url.searchParams.set("asset", params.asset);
      if (params?.scheme !== undefined) url.searchParams.set("scheme", params.scheme);
      if (params?.payTo !== undefined) url.searchParams.set("payTo", params.payTo);
      if (params?.urlSubstring !== undefined)
        url.searchParams.set("urlSubstring", params.urlSubstring);
      if (params?.maxUsdPrice !== undefined)
        url.searchParams.set("maxUsdPrice", params.maxUsdPrice);
      if (params?.extensions !== undefined) {
        for (const ext of params.extensions) {
          url.searchParams.append("extensions", ext);
        }
      }
      if (params?.limit !== undefined) url.searchParams.set("limit", String(params.limit));
      const raw = await fetchJson<unknown>(url.toString());
      return normalizeSearchResponse(raw);
    },

    async getMerchantResources(params) {
      const url = new URL(`${baseUrl}/discovery/merchant`);
      url.searchParams.set("payTo", params.payTo);
      if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
      if (params.offset !== undefined) url.searchParams.set("offset", String(params.offset));

      try {
        return await fetchJson<X402DiscoveryMerchantResponse>(url.toString());
      } catch (error) {
        const isNotFound =
          error instanceof Error &&
          "statusCode" in error &&
          (error as { statusCode?: number }).statusCode === 404;
        if (isNotFound) {
          const pagination: { limit?: number; offset?: number } = {};
          if (params.limit !== undefined) pagination.limit = params.limit;
          if (params.offset !== undefined) pagination.offset = params.offset;
          return {
            x402Version: 2,
            payTo: params.payTo,
            resources: [],
            pagination,
          } as X402DiscoveryMerchantResponse;
        }
        throw error;
      }
    },
  };
}
