/**
 * CDP-opinionated extension wiring for the x402 payment protocol.
 *
 * `CdpResourceServer` automatically advertises all three extensions on every
 * route. Gas-sponsoring extensions are static (presence of key is enough).
 * Bazaar is built per-route from the route key and any user-provided overrides.
 *
 * | Key | Auto-injected | Notes |
 * |-----|---------------|-------|
 * | `"eip2612GasSponsoring"` | ✓ | Sponsored Permit2 via EIP-2612 permit |
 * | `"erc20ApprovalGasSponsoring"` | ✓ | Sponsored ERC-20 approve tx (planned on facilitator) |
 * | `"bazaar"` | ✓ | Minimal discovery metadata built from route pattern |
 *
 * Users who need richer Bazaar metadata (queryParams, body example, output
 * schema, etc.) can override by setting `extensions.bazaar` on the route —
 * their value takes precedence over the auto-generated one.
 *
 * @packageDocumentation
 */

import type { ResourceServerExtension } from "@x402/core/types";

/*
 * ---------------------------------------------------------------------------
 * Extension key constants
 * ---------------------------------------------------------------------------
 */

/**
 * Extension key for EIP-2612 gas-sponsored Permit2 payments.
 *
 * When advertised in `PaymentRequired.extensions`, the x402 EVM client
 * automatically signs an EIP-2612 permit if Permit2 allowance is insufficient
 * — the CDP Facilitator submits the permit transaction, covering the user's gas.
 *
 * Mirrors `EIP2612_GAS_SPONSORING_KEY` from `@x402/evm`.
 */
export const CDP_EXTENSION_GAS_SPONSORING_EIP2612 = "eip2612GasSponsoring" as const;

/**
 * Extension key for ERC-20 approval gas-sponsored payments.
 *
 * When advertised, the x402 EVM client signs an ERC-20 `approve(Permit2, MaxUint256)`
 * transaction and the CDP Facilitator broadcasts it, covering the user's gas cost.
 * The facilitator has this extension implemented but currently disabled; declaring
 * it is forward-compatible.
 *
 * Mirrors `ERC20_APPROVAL_GAS_SPONSORING_KEY` from `@x402/evm`.
 */
export const CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL = "erc20ApprovalGasSponsoring" as const;

/**
 * Extension key for Bazaar resource discovery.
 *
 * Auto-injected by `CdpResourceServer` with a minimal `DiscoveryExtension`
 * built from the route key (HTTP method + path template). Override by
 * providing `extensions.bazaar` in your route config with richer metadata
 * (queryParams, body example, output schema, etc.).
 *
 * Mirrors `bazaar.BAZAAR.Key()` from `github.com/x402-foundation/x402/go`.
 */
export const CDP_EXTENSION_BAZAAR = "bazaar" as const;

/*
 * ---------------------------------------------------------------------------
 * Auto-injected extension set
 * ---------------------------------------------------------------------------
 */

/**
 * Static extension declarations that `CdpResourceServer` injects into every
 * route regardless of route-specific metadata.
 *
 * Both gas-sponsoring entries are present. Their presence signals to the x402
 * EVM client that the CDP Facilitator can cover Permit2 gas costs; the client
 * only activates the path when `requirements.extra.assetTransferMethod` is
 * `"permit2"`, so the declarations are harmless for EIP-3009 and Solana routes.
 *
 * Bazaar is NOT in this set — it is injected separately because it requires
 * per-route metadata (HTTP method, path template) to build its declaration.
 */
export const CDP_SUPPORTED_EXTENSIONS: Record<string, unknown> = {
  [CDP_EXTENSION_GAS_SPONSORING_EIP2612]: {},
  [CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL]: {},
};

/*
 * ---------------------------------------------------------------------------
 * Bazaar discovery declaration builder
 * ---------------------------------------------------------------------------
 */

/** HTTP methods that carry a request body (POST, PUT, PATCH). */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Builds a minimal Bazaar `DiscoveryExtension` declaration from an HTTP method
 * and path template.
 *
 * The resulting declaration is what `CdpResourceServer` injects automatically.
 * It carries enough information for Bazaar to index the route; users who need
 * richer metadata (queryParams, body example, output schema, path-param types)
 * should override by setting `extensions.bazaar` explicitly in their route config.
 *
 * Wire shape follows `github.com/x402-foundation/x402/go/extensions/bazaar`:
 * - GET/HEAD/DELETE → `QueryInput` (`{ type, method }`)
 * - POST/PUT/PATCH  → `BodyInput`  (`{ type, method, bodyType: "json" }`)
 *
 * @param method - Uppercase HTTP verb, e.g. `"GET"` or `"POST"`.
 * @param path   - Path template, e.g. `"/report"` or `"/users/:id"`.
 */
export function buildBazaarDeclaration(method: string, path: string): Record<string, unknown> {
  const isBodyMethod = BODY_METHODS.has(method);
  const input: Record<string, unknown> = { type: "http", method };
  if (isBodyMethod) {
    input.bodyType = "json";
  }

  /*
   * Build the JSON Schema for the info object. Mirrors the output of
   * createQueryDiscoveryExtension / createBodyDiscoveryExtension in the Go SDK
   * (github.com/x402-foundation/x402/go/extensions/bazaar/resource_service.go).
   * The CDP Facilitator's ValidateDiscoveryExtension validates info against this
   * schema; a null/missing schema causes "invalid discovery configuration".
   */
  const inputSchemaProperties: Record<string, unknown> = {
    type: { type: "string", const: "http" },
    method: { type: "string", enum: [method] },
  };
  const inputSchemaRequired = ["type", "method"];

  if (isBodyMethod) {
    inputSchemaProperties.bodyType = { type: "string", enum: ["json"] };
    inputSchemaRequired.push("bodyType");
  }

  const schema: Record<string, unknown> = {
    properties: {
      input: {
        type: "object",
        properties: inputSchemaProperties,
        required: inputSchemaRequired,
        /*
         * Mirrors the Go SDK. The EnrichDeclaration hook in Go adds pathParams
         * to both info and schema at request time; for static routes (no :param
         * segments) the strict schema is correct as-is.
         */
        additionalProperties: false,
      },
    },
  };

  return {
    info: { input },
    schema,
    routeTemplate: path,
  };
}

/*
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

/**
 * Extension map for `CdpRouteConfig.extensions`.
 *
 * All three CDP extensions are injected automatically by `CdpResourceServer`.
 * Use this field to **override** the auto-generated Bazaar declaration with
 * richer discovery metadata (queryParams, body example, output schema, etc.).
 *
 * For the full Bazaar `DiscoveryExtension` shape, see:
 * `github.com/x402-foundation/x402/go/extensions/bazaar`
 */
export type CdpExtensions = Record<string, unknown>;

/*
 * ---------------------------------------------------------------------------
 * ResourceServerExtension registrations
 * ---------------------------------------------------------------------------
 */

/**
 * Returns `ResourceServerExtension` registrations for all CDP-supported extensions.
 *
 * These register enrichment handlers on `x402ResourceServer` so that routes
 * whose `extensions` include a CDP extension key get the correct
 * `PaymentRequired.extensions[key]` value. Each handler is a no-op for routes
 * that do not declare its key.
 *
 * `CdpResourceServer.create()` calls this automatically. Call it manually
 * only when building a resource server without `CdpResourceServer`:
 *
 * ```typescript
 * import { x402ResourceServer } from "@x402/core/server";
 * import { getCdpExtensionRegistrations } from "@coinbase/x402/extensions";
 *
 * const server = new x402ResourceServer(facilitatorClient);
 * for (const ext of getCdpExtensionRegistrations()) {
 *   server.registerExtension(ext);
 * }
 * ```
 */
export function getCdpExtensionRegistrations(): ResourceServerExtension[] {
  return [
    {
      key: CDP_EXTENSION_GAS_SPONSORING_EIP2612,
      // Pass declaration through; the client checks for key presence only.
      enrichPaymentRequiredResponse: async declaration => declaration ?? {},
    },
    {
      key: CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
      // Forward-compatible: facilitator activates when platform enables it.
      enrichPaymentRequiredResponse: async declaration => declaration ?? {},
    },
    {
      key: CDP_EXTENSION_BAZAAR,
      // User-provided discovery metadata is passed through as-is.
      enrichPaymentRequiredResponse: async declaration => declaration ?? {},
    },
  ];
}
