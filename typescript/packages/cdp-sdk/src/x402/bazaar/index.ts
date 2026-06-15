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

import type {
  X402DiscoveryMerchantResponse,
  X402DiscoveryResource,
  X402DiscoveryResourceType,
  X402DiscoveryResourcesResponse,
  X402ResourceQuality,
  X402SearchResourcesResponse,
  X402SearchResourcesResponseSearchMethod,
  ListX402DiscoveryMerchantParams,
  ListX402DiscoveryResourcesParams,
  SearchX402ResourcesParams,
} from "../../openapi-client/index.js";

export type {
  X402ResourceQuality,
  X402DiscoveryResource,
  X402DiscoveryResourceType,
  X402DiscoveryResourcesResponse,
  X402DiscoveryMerchantResponse,
  X402SearchResourcesResponseSearchMethod,
  ListX402DiscoveryResourcesParams,
  ListX402DiscoveryMerchantParams,
  SearchX402ResourcesParams,
};

/** Options for creating a CDP Bazaar client. */
export interface CdpBazaarClientArgs {
  /**
   * Override the CDP Bazaar base URL.
   *
   * @deprecated Custom base URL overrides are no longer supported in the SDK
   * and will throw at runtime.
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
 * Creates a CDP Bazaar client backed by the generated OpenAPI functions.
 *
 * No CDP API key credentials are required — the Bazaar endpoints are public.
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
    throw new Error(
      "Custom Bazaar baseUrl overrides are no longer supported. " +
        "Use the default CDP API host for discovery/search endpoints.",
    );
  }

  return {
    async listResources(params) {
      return listX402DiscoveryResources(params);
    },

    async searchResources(params) {
      return searchX402Resources(params);
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
