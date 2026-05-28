/**
 * CDP Bazaar client for discovering and searching x402-gated resources.
 *
 * Types are sourced from `@coinbase/cdp-sdk` (generated from the OpenAPI spec).
 * The CDP Bazaar endpoints are unauthenticated — only a Correlation-Context
 * header is required; no CDP API key credentials are needed.
 */

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
} from "@coinbase/cdp-sdk";

import { CDP_FACILITATOR_URL } from "../facilitator/constants.js";
import { SDK_METADATA } from "../constants.js";

/**
 * The CDP Bazaar API can return additional values (e.g. `"hybrid"`) that are
 * not yet declared by the `@coinbase/cdp-sdk` enum at generation time. We widen
 * the type here so consumers performing exhaustive checks see the full set of
 * runtime values.
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
   * Defaults to `https://api.cdp.coinbase.com/platform/v2/x402`.
   */
  baseUrl?: string;
}

/** CDP Bazaar client interface for discovering and searching x402 resources. */
export interface CdpBazaarClient {
  /**
   * List x402 discovery resources from the CDP Bazaar.
   *
   * @param params - Optional filtering and pagination parameters.
   */
  listResources(params?: ListX402DiscoveryResourcesParams): Promise<X402DiscoveryResourcesResponse>;

  /**
   * Search x402 resources in the CDP Bazaar using a natural-language query.
   *
   * @param params - Search parameters.
   */
  searchResources(params?: SearchX402ResourcesParams): Promise<X402SearchResourcesResponse>;

  /**
   * Fetch all resources registered by a specific merchant address.
   *
   * @param params - Merchant parameters including the required payTo address.
   */
  getMerchantResources(
    params: ListX402DiscoveryMerchantParams,
  ): Promise<X402DiscoveryMerchantResponse>;
}

function buildCorrelationContext(): string {
  return Object.entries(SDK_METADATA)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

class BazaarRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BazaarRequestError";
    this.status = status;
  }
}

async function fetchDiscovery<T>(url: string, correlationContext: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Correlation-Context": correlationContext,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new BazaarRequestError(
      response.status,
      `CDP Bazaar request failed (${response.status}): ${body}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Normalize a raw search response from the CDP Bazaar API.
 *
 * The SDK's generated `X402SearchResourcesResponseSearchMethod` enum may lag
 * behind the API (e.g. it is missing `"hybrid"` at the time of writing). We
 * accept any string for `searchMethod` and surface it via the widened type so
 * consumers see the actual runtime value instead of `undefined` or a type
 * mismatch.
 */
function normalizeSearchResponse(raw: unknown): X402SearchResourcesResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  const searchMethod = data.searchMethod;
  return {
    ...(data as object),
    ...(typeof searchMethod === "string"
      ? { searchMethod: searchMethod as X402SearchResourcesResponseSearchMethod }
      : {}),
  } as X402SearchResourcesResponse;
}

/**
 * Creates a CDP Bazaar client for discovering and searching x402-gated resources.
 *
 * The CDP Bazaar discovery endpoints are unauthenticated. No CDP API key
 * credentials are required to use this client.
 *
 * @param args - Optional configuration overrides (e.g., `baseUrl`).
 * @returns A `CdpBazaarClient` with `listResources`, `searchResources`, and `getMerchantResources`.
 *
 * @example
 * ```typescript
 * const bazaar = createCdpBazaarClient();
 *
 * const resources = await bazaar.listResources({ type: "http", limit: 20 });
 * const results = await bazaar.searchResources({ query: "weather APIs", maxUsdPrice: "1.00" });
 * const merchant = await bazaar.getMerchantResources({ payTo: "0xYourAddress" });
 * ```
 */
export function createCdpBazaarClient(args?: CdpBazaarClientArgs): CdpBazaarClient {
  const baseUrl = normalizeBaseUrl(args?.baseUrl ?? CDP_FACILITATOR_URL);
  const correlationContext = buildCorrelationContext();

  return {
    async listResources(params) {
      const url = new URL(`${baseUrl}/discovery/resources`);
      if (params?.type !== undefined) url.searchParams.set("type", params.type);
      if (params?.limit !== undefined) url.searchParams.set("limit", String(params.limit));
      if (params?.offset !== undefined) url.searchParams.set("offset", String(params.offset));

      return fetchDiscovery<X402DiscoveryResourcesResponse>(url.toString(), correlationContext);
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

      const raw = await fetchDiscovery<unknown>(url.toString(), correlationContext);
      return normalizeSearchResponse(raw);
    },

    async getMerchantResources(params) {
      const url = new URL(`${baseUrl}/discovery/merchant`);
      url.searchParams.set("payTo", params.payTo);
      if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
      if (params.offset !== undefined) url.searchParams.set("offset", String(params.offset));

      try {
        return await fetchDiscovery<X402DiscoveryMerchantResponse>(
          url.toString(),
          correlationContext,
        );
      } catch (error) {
        if (error instanceof BazaarRequestError && error.status === 404) {
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
